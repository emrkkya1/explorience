import { CategoryQuotaEntry, LLMClient, PipelineConfig, RawPlace, Stage } from '../types';
import { logger } from '../../utils/logging';

type ScoredPlace = {
  place: RawPlace;
  score: number;
  weight: number;
  isUnmatched: boolean;
};

type TypeStats = {
  type: string;
  total: number;
  kept: number;
  threshold: number;
};

export class CategoryQuotasStage implements Stage {
  name = 'category_quotas';

  constructor(private llmClient?: LLMClient) {}

  async run(places: RawPlace[], config: PipelineConfig): Promise<RawPlace[]> {
    const stageConfig = config.stages.find(s => s.name === this.name);
    const quotas = (stageConfig?.params?.quotas ?? []) as CategoryQuotaEntry[];
    const maxPlaces = stageConfig?.params?.maxPlaces ?? 500;
    const targetMin = Math.floor(maxPlaces / 3);
    const targetMax = maxPlaces;
    const defaultWeight = stageConfig?.params?.defaultWeight ?? 0.5;

    if (quotas.length === 0) {
      logger.warn('category_quotas: no quota entries configured, keeping all places');
      return places;
    }

    logger.summary({
      places: places.length,
      'max places': maxPlaces,
      'target range': `${targetMin}–${targetMax}`,
      'quota types': quotas.length
    });

    const quotaMap = new Map(quotas.map(q => [q.typeName, q]));
    const allKnownTypes = new Set([...config.types, ...quotaMap.keys()]);

    let scored = this.computeScores(places, quotaMap, allKnownTypes, defaultWeight);

    let currentQuotas = quotas;
    const typeStats = this.filterByThresholdsWithStats(scored, currentQuotas);
    scored = this.filterFromStats(scored, typeStats);
    logger.debug(`category_quotas: first pass — ${scored.length} places`);

    if (scored.length < targetMin) {
      logger.warn(`category_quotas: only ${scored.length} places (< min ${targetMin}), retrying with sqrt thresholds`);
      currentQuotas = quotas.map(q => ({
        ...q,
        threshold: Math.sqrt(q.threshold)
      }));
      scored = this.computeScores(places, quotaMap, allKnownTypes, defaultWeight);
      const retryStats = this.filterByThresholdsWithStats(scored, currentQuotas);
      scored = this.filterFromStats(scored, retryStats);
      logger.debug(`category_quotas: retry pass — ${scored.length} places`);
    }

    if (scored.length > targetMax) {
      const beforeCull = scored.length;
      scored = this.cullToMax(scored, currentQuotas, targetMax);
      logger.info(`category_quotas: culled ${beforeCull} → ${scored.length} (target ${targetMax})`);
    }

    const tableRows = typeStats.map(stat => [
      stat.type,
      `${stat.kept}/${stat.total}`,
      stat.threshold.toFixed(2)
    ]);
    logger.table(['type', 'kept/total', 'threshold'], tableRows);

    logger.summary({
      total: scored.length
    });

    return scored.map(s => ({ ...s.place, qualityScore: s.score }));
  }

  private computeScores(
    places: RawPlace[],
    quotaMap: Map<string, CategoryQuotaEntry>,
    allKnownTypes: Set<string>,
    defaultWeight: number,
  ): ScoredPlace[] {
    const scored: ScoredPlace[] = [];

    for (const place of places) {
      const primaryType = place.primaryType
        || place.types.find(t => allKnownTypes.has(t))
        || place.types[0]
        || 'unknown';

      const quota = quotaMap.get(primaryType);
      const weight = quota?.weight ?? defaultWeight;
      const reviews = place.totalReviews ?? 0;
      const rating = place.rating ?? 0;
      const score = Math.log10(reviews + 1) * Math.pow(rating / 5, 2) * weight;

      scored.push({
        place: { ...place, primaryType },
        score,
        weight,
        isUnmatched: !quota,
      });
    }

    return scored;
  }

  private filterByThresholdsWithStats(
    scored: ScoredPlace[],
    quotas: CategoryQuotaEntry[],
  ): TypeStats[] {
    const quotaMap = new Map(quotas.map(q => [q.typeName, q]));
    const groups = new Map<string, ScoredPlace[]>();

    for (const s of scored) {
      const type = s.place.primaryType || 'unknown';
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type)!.push(s);
    }

    const stats: TypeStats[] = [];

    for (const [type, typePlaces] of groups) {
      const quota = quotaMap.get(type);

      if (!quota) {
        logger.warn(`category_quotas: unmatched type "${type}" — ${typePlaces.length} places (kept all)`);
        stats.push({ type, total: typePlaces.length, kept: typePlaces.length, threshold: 1.0 });
        continue;
      }

      typePlaces.sort((a, b) => b.score - a.score);
      const keepCount = Math.ceil(typePlaces.length * quota.threshold);

      stats.push({ type, total: typePlaces.length, kept: keepCount, threshold: quota.threshold });
    }

    return stats;
  }

  private filterFromStats(scored: ScoredPlace[], stats: TypeStats[]): ScoredPlace[] {
    const groups = new Map<string, ScoredPlace[]>();
    for (const s of scored) {
      const type = s.place.primaryType || 'unknown';
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type)!.push(s);
    }

    const selected = new Set<string>();
    const statsMap = new Map(stats.map(s => [s.type, s]));

    for (const [type, typePlaces] of groups) {
      const stat = statsMap.get(type);
      if (!stat) continue;

      typePlaces.sort((a, b) => b.score - a.score);
      const kept = typePlaces.slice(0, stat.kept);
      for (const s of kept) selected.add(s.place.id);
    }

    return scored.filter(s => selected.has(s.place.id));
  }

  private cullToMax(
    scored: ScoredPlace[],
    quotas: CategoryQuotaEntry[],
    targetMax: number,
  ): ScoredPlace[] {
    const quotaMap = new Map(quotas.map(q => [q.typeName, q]));
    const protected_: ScoredPlace[] = [];
    const removable: ScoredPlace[] = [];

    for (const s of scored) {
      const quota = quotaMap.get(s.place.primaryType || '');
      if (quota?.neverRemove || s.isUnmatched) {
        protected_.push(s);
      } else {
        removable.push(s);
      }
    }

    removable.sort((a, b) => a.score - b.score);

    const toRemove = Math.max(0, removable.length + protected_.length - targetMax);
    const keptRemovable = removable.slice(toRemove);

    if (toRemove < removable.length + protected_.length - targetMax) {
      logger.warn(`category_quotas: cull stopped early — all remaining places are neverRemove (${protected_.length} protected, ${keptRemovable.length} removable kept)`);
    }

    const result = [...keptRemovable, ...protected_];
    result.sort((a, b) => b.score - a.score);

    return result;
  }
}

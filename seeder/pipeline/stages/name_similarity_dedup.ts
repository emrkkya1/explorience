import { LLMClient } from '../../clients/llm_client';
import { PipelineConfig, RawPlace, Stage } from '../types';
import { calculateSimilarity } from '../../utils/string_similarity';
import { haversineDistance } from '../../utils/geo';
import { logger } from '../../utils/logging';

export class NameSimilarityDedupStage implements Stage {
  name = 'name_similarity_dedup';

  constructor(private llmClient?: LLMClient) {}

  async run(places: RawPlace[], config: PipelineConfig): Promise<RawPlace[]> {
    const stageConfig = config.stages.find(s => s.name === this.name);
    const threshold = stageConfig?.params?.threshold ?? 0.85;
    const maxDistanceMeters = stageConfig?.params?.maxDistanceMeters ?? 100;

    logger.summary({
      places: places.length,
      threshold,
      'max distance': `${maxDistanceMeters}m`
    });

    const duplicates = new Set<string>();
    const kept = new Map<string, string>();

    for (let i = 0; i < places.length; i++) {
      if (duplicates.has(places[i].id)) continue;

      for (let j = i + 1; j < places.length; j++) {
        if (duplicates.has(places[j].id)) continue;

        const place1 = places[i];
        const place2 = places[j];

        const similarity = calculateSimilarity(place1.name, place2.name);

        if (similarity >= threshold) {
          const distance = haversineDistance(place1.location, place2.location);

          if (distance <= maxDistanceMeters) {
            const [toKeep, toRemove] = this.chooseWhichToKeep(place1, place2);

            duplicates.add(toRemove.id);
            kept.set(toRemove.id, toKeep.id);

            logger.debug('Found duplicate', {
              kept: toKeep.name,
              removed: toRemove.name,
              similarity: similarity.toFixed(3),
              distance: Math.round(distance)
            });
          }
        }
      }
    }

    const result = places.filter(place => !duplicates.has(place.id));

    logger.summary({
      duplicates: duplicates.size,
      remaining: result.length
    });

    return result;
  }

  private chooseWhichToKeep(place1: RawPlace, place2: RawPlace): [RawPlace, RawPlace] {
    const reviews1 = place1.totalReviews ?? 0;
    const reviews2 = place2.totalReviews ?? 0;

    if (reviews1 !== reviews2) {
      return reviews1 > reviews2 ? [place1, place2] : [place2, place1];
    }

    const rating1 = place1.rating ?? 0;
    const rating2 = place2.rating ?? 0;

    if (rating1 !== rating2) {
      return rating1 > rating2 ? [place1, place2] : [place2, place1];
    }

    return [place1, place2];
  }
}

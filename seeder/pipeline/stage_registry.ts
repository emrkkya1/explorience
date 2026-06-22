import { Stage } from './types';
import { PlaceFetchingStage } from './stages/place_fetching';
import { NameSimilarityDedupStage } from './stages/name_similarity_dedup';
import { ProximityDedupStage } from './stages/proximity_dedup';
import { RatingThresholdStage } from './stages/rating_threshold';
import { GenericFilterStage } from './stages/generic_filter';
import { CategoryQuotasStage } from './stages/category_quotas';
import { LLMRankingStage } from './stages/llm_ranking';
import { LLMClient } from '../clients/llm_client';

const STAGE_REGISTRY: Record<string, new (llmClient?: LLMClient) => Stage> = {
  place_fetching: PlaceFetchingStage,
  name_similarity_dedup: NameSimilarityDedupStage,
  proximity_dedup: ProximityDedupStage,
  rating_threshold: RatingThresholdStage,
  generic_filter: GenericFilterStage,
  category_quotas: CategoryQuotasStage,
  llm_ranking: LLMRankingStage,
};

export function createStage(name: string, llmClient?: LLMClient): Stage | null {
  const StageClass = STAGE_REGISTRY[name];
  if (!StageClass) {
    return null;
  }
  return new StageClass(llmClient);
}

export function getAvailableStages(): string[] {
  return Object.keys(STAGE_REGISTRY);
}

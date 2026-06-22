import { LLMClient } from '../../clients/llm_client';
import { PipelineConfig, RawPlace, Stage } from '../types';
import { logger } from '../../utils/logging';

export class RatingThresholdStage implements Stage {
  name = 'rating_threshold';

  constructor(private llmClient?: LLMClient) {}

  async run(places: RawPlace[], config: PipelineConfig): Promise<RawPlace[]> {
    const stageConfig = config.stages.find(s => s.name === this.name);
    const minReviews = stageConfig?.params?.minReviews ?? 5;

    logger.summary({
      places: places.length,
      'min reviews': minReviews
    });

    let noRatingCount = 0;
    let lowReviewsCount = 0;

    const result = places.filter(place => {
      if (place.rating === null || place.rating === undefined) {
        noRatingCount++;
        logger.debug('Dropping place with no rating', {
          name: place.name,
          id: place.id
        });
        return false;
      }

      const reviews = place.totalReviews ?? 0;
      if (reviews < minReviews) {
        lowReviewsCount++;
        logger.debug('Dropping place with low reviews', {
          name: place.name,
          id: place.id,
          reviews,
          minReviews
        });
        return false;
      }

      return true;
    });

    logger.summary({
      'no rating': noRatingCount,
      'low reviews': lowReviewsCount,
      remaining: result.length
    });

    return result;
  }
}

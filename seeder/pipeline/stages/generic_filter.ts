import { LLMClient } from '../../clients/llm_client';
import { PipelineConfig, RawPlace, Stage } from '../types';
import { logger } from '../../utils/logging';

export class GenericFilterStage implements Stage {
  name = 'generic_filter';

  constructor(private llmClient?: LLMClient) {}

  async run(places: RawPlace[], config: PipelineConfig): Promise<RawPlace[]> {
    const stageConfig = config.stages.find(s => s.name === this.name);
    const blacklistedTypes = stageConfig?.params?.blacklistedTypes ?? [];
    const namePatterns = stageConfig?.params?.namePatterns ?? [];

    logger.summary({
      places: places.length,
      'blacklisted types': blacklistedTypes.length,
      'name patterns': namePatterns.length
    });

    let blacklistedTypeCount = 0;
    let namePatternCount = 0;

    const result = places.filter(place => {
      const hasBlacklistedType = place.types.some(type =>
        blacklistedTypes.includes(type)
      );

      if (hasBlacklistedType) {
        blacklistedTypeCount++;
        logger.debug('Dropping place with blacklisted type', {
          name: place.name,
          id: place.id,
          matchedTypes: place.types.filter(t => blacklistedTypes.includes(t))
        });
        return false;
      }

      const matchesPattern = namePatterns.some(pattern => pattern.test(place.name));

      if (matchesPattern) {
        namePatternCount++;
        logger.debug('Dropping place matching name pattern', {
          name: place.name,
          id: place.id
        });
        return false;
      }

      return true;
    });

    logger.summary({
      'blacklisted removed': blacklistedTypeCount,
      'name pattern removed': namePatternCount,
      remaining: result.length
    });

    return result;
  }
}

import { PipelineConfig, RawPlace, Stage } from '../types';
import { GoogleMapsClient } from '../../clients/google_maps_client';
import { logger } from '../../utils/logging';

export class PlaceFetchingStage implements Stage {
  name = 'place_fetching';

  async run(places: RawPlace[], config: PipelineConfig): Promise<RawPlace[]> {
    if (places.length > 0) {
      logger.info('place_fetching: skipped — input places provided', { count: places.length });
      return places;
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY environment variable is required for place_fetching stage');
    }

    const stageConfig = config.stages.find(s => s.name === this.name);
    const delayMs = stageConfig?.params?.delayMs ?? 125;

    const totalCells = config.resolution * config.resolution;
    logger.summary({
      resolution: config.resolution,
      cells: totalCells,
      delay: `${delayMs}ms`
    });

    const startTime = Date.now();
    const client = new GoogleMapsClient(apiKey);
    const result = await client.fetchCityGrid(
      config.bounds,
      config.types,
      config.resolution,
      delayMs,
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.summary({
      'places fetched': result.length,
      'time elapsed': `${elapsed}s`
    });

    return result;
  }
}

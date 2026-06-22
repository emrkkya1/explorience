import 'dotenv/config';
import { Pipeline } from '../pipeline/pipeline';
import { pragueConfig } from '../config/prague';
import { logger } from '../utils/logging';
import fs from 'fs';

async function main() {
  logger.info('Testing pipeline with existing Prague data');

  // Load existing data
  const dataPath = 'output/prague-r15-ideal.json';
  if (!fs.existsSync(dataPath)) {
    logger.error('Data file not found', { path: dataPath });
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  // Transform old format to new format
  const places = rawData.map((place: any) => ({
    id: place.google_place_id || place.id,
    name: place.name,
    types: place.types,
    rating: place.rating,
    totalReviews: place.total_reviews ?? place.totalReviews,
    location: place.coordinates || place.location,
    gridId: place.grid_id || place.gridId,
  }));
  
  logger.info('Loaded places', { count: places.length });

  const pipeline = new Pipeline(pragueConfig, undefined, true);
  const result = await pipeline.run(places);

  logger.info('Pipeline test complete', {
    initial: places.length,
    final: result.length,
  });
}

main().catch(error => {
  logger.error('Pipeline test failed', { error: error.message });
  process.exit(1);
});

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logging';

const __dirname = dirname(fileURLToPath(import.meta.url));

type PoiFromJson = {
  id: string;
  name: string;
  types: string[];
  rating: number;
  totalReviews: number;
  location: { lat: number; lng: number };
  primaryType: string;
  assignedCategory: string;
  rarity: string;
  description: string;
};

const CATEGORY_MAP: Record<string, string> = {
  'miscallaneous': 'miscellaneous',
};

function normalizeCategory(cat: string): string {
  return CATEGORY_MAP[cat] ?? cat;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const jsonPath = resolve(__dirname, '../output/pipeline/krakow/99-final_2026-06-26T18-46-19.json');
  const pois: PoiFromJson[] = JSON.parse(readFileSync(jsonPath, 'utf-8'));

  logger.info(`Loaded ${pois.length} POIs from ${jsonPath}`);

  const { data: city, error: cityError } = await supabase
    .from('cities')
    .select('id')
    .eq('name', 'KRAKOW')
    .single();

  if (cityError || !city) {
    logger.error('Could not find KRAKOW city', { error: cityError });
    process.exit(1);
  }

  const cityId: number = city.id;
  logger.info(`Found KRAKOW city_id: ${cityId}`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const poi of pois) {
    const { data, error } = await supabase.from('pois').insert({
      city_id: cityId,
      google_place_id: poi.id,
      name: poi.name,
      latitude: poi.location.lat,
      longitude: poi.location.lng,
      types: JSON.stringify(poi.types),
      primary_type: poi.primaryType,
      category: normalizeCategory(poi.assignedCategory),
      rarity: poi.rarity,
      description: poi.description,
      rating: poi.rating,
      total_reviews: poi.totalReviews,
    });

    if (error) {
      if (error.message.includes('duplicate key') || error.code === '23505') {
        skipped++;
        logger.warn(`Skipped duplicate: ${poi.name}`);
      } else {
        failed++;
        logger.error(`Failed to insert ${poi.name}`, { error: error.message });
      }
    } else {
      inserted++;
    }
  }

  logger.info('Seeding complete', { inserted, skipped, failed, total: pois.length });
}

main().catch(error => {
  logger.error('Seeder failed', { error: error.message });
  process.exit(1);
});

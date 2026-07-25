import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { select, confirm, number } from '@inquirer/prompts';
import { GoogleMapsClient, PhotoMeta } from '../clients/google_maps_client';
import { logger } from '../utils/logging';

type CityRow = {
  id: number;
  name: string;
};

type PoiRow = {
  id: string;
  google_place_id: string;
  name: string;
  image_uri: string | null;
};

const BUCKET = 'poi_images';
const IMG_INDEX = 0;
const DEFAULT_MAX_HEIGHT = 1080;
const DEFAULT_DELAY_MS = 150;

function chooseBestPhoto(photos: PhotoMeta[]): PhotoMeta | null {
  if (photos.length === 0) return null;

  const vertical = photos.filter((p) => p.heightPx > p.widthPx);
  const pool = vertical.length > 0 ? vertical : photos;
  const rank = (p: PhotoMeta) => p.heightPx * p.widthPx;
  return pool.reduce((best, p) => (rank(p) > rank(best) ? p : best));
}

async function main() {
  console.log('\n🖼️  POI Image Seeder\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }
  if (!mapsKey) {
    logger.error('Missing GOOGLE_MAPS_API_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const maps = new GoogleMapsClient(mapsKey);

  const { data: cities, error: citiesErr } = await supabase
    .from('cities')
    .select('id, name')
    .order('name');

  if (citiesErr || !cities || cities.length === 0) {
    logger.error('No cities found in database', { error: citiesErr?.message });
    process.exit(1);
  }

  const cityChoice = await select<CityRow>({
    message: 'Select city to seed images for:',
    choices: (cities as CityRow[]).map((c) => ({ name: c.name, value: c })),
  });

  const force = await confirm({
    message: 'Re-fetch even for POIs that already have image_uri?',
    default: false,
  });

  const maxHeight = await number({
    message: 'Max image height (px):',
    default: DEFAULT_MAX_HEIGHT,
  });

  const delayMs = await number({
    message: 'Delay between POIs (ms):',
    default: DEFAULT_DELAY_MS,
  });

  const limitInput = await number({
    message: 'Limit to N POIs (blank = all):',
    default: undefined,
  });

  const effectiveMaxHeight = maxHeight ?? DEFAULT_MAX_HEIGHT;
  const effectiveDelay = delayMs ?? DEFAULT_DELAY_MS;
  const limit = limitInput ?? null;

  console.log('\n--- Summary ---');
  console.log(`City:        ${cityChoice.name} (id ${cityChoice.id})`);
  console.log(`Force:       ${force}`);
  console.log(`Max height:  ${effectiveMaxHeight}px`);
  console.log(`Delay:       ${effectiveDelay}ms`);
  console.log(`Limit:       ${limit ?? 'all'}`);

  const go = await confirm({ message: '\nStart seeding?', default: true });
  if (!go) {
    console.log('Aborted.');
    return;
  }

  const { data: pois, error: poisErr } = await supabase
    .from('pois')
    .select('id, google_place_id, name, image_uri')
    .eq('city_id', cityChoice.id);

  if (poisErr || !pois) {
    logger.error('Failed to fetch pois', { error: poisErr?.message });
    process.exit(1);
  }

  const allPois = pois as PoiRow[];
  const todo = force ? allPois : allPois.filter((p) => !p.image_uri);
  const target = limit ? todo.slice(0, limit) : todo;

  logger.info(`Seeding images for ${cityChoice.name}`, {
    city_id: cityChoice.id,
    total_pois: allPois.length,
    to_process: target.length,
    skipped_already_seeded: allPois.length - todo.length,
    force,
    maxHeight: effectiveMaxHeight,
  });

  let succeeded = 0;
  let noPhotos = 0;
  let failed = 0;

  for (let i = 0; i < target.length; i++) {
    const poi = target[i];
    const progress = `[${i + 1}/${target.length}]`;

    try {
      const photos = await maps.getPlacePhotos(poi.google_place_id);
      const best = chooseBestPhoto(photos);

      if (!best) {
        noPhotos++;
        logger.warn(`${progress} no photos — ${poi.name}`);
        continue;
      }

      const bytes = await maps.downloadPhoto(best.name, effectiveMaxHeight, effectiveMaxHeight);
      const key = `${cityChoice.id}_${poi.id}_${IMG_INDEX}.jpg`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(key, bytes, { contentType: 'image/jpeg', upsert: true });

      if (upErr) {
        failed++;
        logger.error(`${progress} upload failed — ${poi.name}`, { error: upErr.message });
        continue;
      }

      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;

      const { error: updErr } = await supabase
        .from('pois')
        .update({ image_uri: publicUrl })
        .eq('id', poi.id);

      if (updErr) {
        failed++;
        logger.error(`${progress} db update failed — ${poi.name}`, { error: updErr.message });
        continue;
      }

      succeeded++;
      logger.info(`${progress} ✓ ${poi.name}`);
    } catch (err: any) {
      failed++;
      logger.error(`${progress} ✖ ${poi.name}`, { error: err.message });
    }

    if (effectiveDelay > 0 && i < target.length - 1) {
      await new Promise((r) => setTimeout(r, effectiveDelay));
    }
  }

  logger.summary({
    city: cityChoice.name,
    succeeded,
    no_photos: noPhotos,
    failed,
    processed: target.length,
  });
}

main().catch((err) => {
  logger.error('Image seeder failed', { error: err.message });
  process.exit(1);
});

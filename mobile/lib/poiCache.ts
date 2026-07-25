import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Poi } from '@/types/Poi';

// AsyncStorage cache of the most recent POIs fetched for a city. The
// background location task reads this to evaluate hint/discovery proximity
// without making network calls; usePois writes to it on foreground fetch.

const PREFIX = 'explorience_poi_cache_';

export async function writePoiCache(cityId: number, pois: Poi[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${PREFIX}${cityId}`, JSON.stringify(pois));
  } catch (e) {
    console.warn('[poiCache] write failed', e);
  }
}

export async function readPoiCache(cityId: number): Promise<Poi[]> {
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX}${cityId}`);
    return raw ? (JSON.parse(raw) as Poi[]) : [];
  } catch {
    return [];
  }
}
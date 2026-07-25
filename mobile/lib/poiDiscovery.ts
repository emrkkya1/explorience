import { getPoisInRadius } from '@/lib/geo';
import { FOG_CONFIG } from '@/constants/FogOfWar';
import type { Poi } from '@/types/Poi';
import type { PlayerLocation } from '@/types/FogOfWar';

export type PoiDetectionResult = {
  newHints: Poi[];
  newDiscoveries: Poi[];
};

// Pure-fn extract of the proximity check that usePoiDiscovery and the
// background task both need. Given the player's location, the cached POIs,
// and the current "already hinted / already discovered" sets, returns the
// delta events that should be staged + synced.
export function detectPoiEvents(
  location: PlayerLocation,
  pois: Poi[],
  hintedPoiIds: Set<string>,
  discoveredPoiIds: Set<string>
): PoiDetectionResult {
  // Stage 1: Hint detection (200m radius)
  const nearby = getPoisInRadius(pois, location, FOG_CONFIG.POI_HINT_RADIUS_METERS);
  const newHints = nearby.filter((poi) => !hintedPoiIds.has(poi.id));

  // Stage 2: Discovery (65m radius, only for hinted POIs)
  const close = getPoisInRadius(pois, location, FOG_CONFIG.POI_DISCOVER_RADIUS_METERS);
  const newDiscoveries = close.filter(
    (poi) => hintedPoiIds.has(poi.id) && !discoveredPoiIds.has(poi.id)
  );

  return { newHints, newDiscoveries };
}
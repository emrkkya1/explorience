import { applyDeltas } from '@/lib/bitmap/core';
import { getBitIndicesInRadius } from '@/lib/bitmap/mapping';
import type { CityBounds } from '@/lib/geo';
import { FOG_CONFIG } from '@/constants/FogOfWar';
import type { PlayerLocation } from '@/types/FogOfWar';

// Pure-fn extract of the explore-cells step that useFogOfWar and the
// background location task both need. Mutates `bitmap` in place and returns
// the list of newly-cleared bit indices (caller persists them as deltas).
export function exploreCellsAtLocation(
  location: PlayerLocation,
  bounds: CityBounds,
  gridWidth: number,
  gridHeight: number,
  bitmap: Uint8Array
): number[] {
  const indices = getBitIndicesInRadius(
    location.latitude,
    location.longitude,
    FOG_CONFIG.FOG_CLEAR_RADIUS_CELLS,
    bounds,
    gridWidth,
    gridHeight
  );

  const newBits: number[] = [];
  for (const idx of indices) {
    if (bitmap[idx] === 0) newBits.push(idx);
  }

  if (newBits.length > 0) {
    applyDeltas(bitmap, newBits);
  }

  return newBits;
}
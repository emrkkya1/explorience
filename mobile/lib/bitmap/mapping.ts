import type { CityBounds } from '@/lib/geo';

export const CELL_SIZE = 0.0001;

export function getGridDimensions(bounds: CityBounds): { width: number; height: number } {
  return {
    width: Math.ceil((bounds.east - bounds.west) / CELL_SIZE),
    height: Math.ceil((bounds.north - bounds.south) / CELL_SIZE),
  };
}

export function latLngToBitIndex(lat: number, lng: number, bounds: CityBounds, gridWidth: number, gridHeight: number): number {
  const x = Math.floor((lng - bounds.west) / CELL_SIZE);
  const y = Math.floor((lat - bounds.south) / CELL_SIZE);

  if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
    return -1;
  }

  return y * gridWidth + x;
}

export function getBitIndicesInRadius(centerLat: number, centerLng: number, radiusCells: number, bounds: CityBounds, gridWidth: number, gridHeight: number): number[] {
  const centerX = Math.floor((centerLng - bounds.west) / CELL_SIZE);
  const centerY = Math.floor((centerLat - bounds.south) / CELL_SIZE);
  const indices: number[] = [];

  const r2 = (radiusCells + 0.5) * (radiusCells + 0.5);
  for (let dy = -radiusCells; dy <= radiusCells; dy++) {
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
      if (dx * dx + dy * dy <= r2) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
          indices.push(y * gridWidth + x);
        }
      }
    }
  }

  return indices;
}

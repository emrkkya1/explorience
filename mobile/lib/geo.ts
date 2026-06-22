import type { PlayerLocation } from '@/types/FogOfWar';
import type { Poi } from '@/types/Poi';

export type CityBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export function getDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getPoisInRadius(
  pois: Poi[],
  location: PlayerLocation,
  radiusMeters: number
): Poi[] {
  return pois.filter((poi) => {
    const dist = getDistanceMeters(
      location.latitude, location.longitude,
      poi.latitude, poi.longitude
    );
    return dist <= radiusMeters;
  });
}

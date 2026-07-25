import type { PlayerLocation } from '@/types/FogOfWar';
import type { Poi } from '@/types/Poi';

export type CityBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type GeoJsonPoint = [number, number];

export type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: GeoJsonPoint[][];
};

export type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    properties: Record<string, unknown>;
    geometry: GeoJsonPolygon;
  }[];
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

export function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceM: number
): { lat: number; lng: number } {
  const R = 6371000;
  const bearing = bearingDeg * Math.PI / 180;
  const lat1 = lat * Math.PI / 180;
  const lng1 = lng * Math.PI / 180;
  const dr = distanceM / R;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dr) +
    Math.cos(lat1) * Math.sin(dr) * Math.cos(bearing)
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(dr) * Math.cos(lat1),
    Math.cos(dr) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: lat2 * 180 / Math.PI,
    lng: ((lng2 * 180 / Math.PI + 540) % 360) - 180,
  };
}

export function buildVisionCone(
  location: PlayerLocation,
  heading: number,
  radiusM: number,
  halfAngleDeg: number,
  leadDistanceM: number = 0,
  bands: number = 1
): GeoJsonFeatureCollection {
  const apexOrigin = leadDistanceM > 0
    ? destinationPoint(location.latitude, location.longitude, heading, leadDistanceM)
    : { lat: location.latitude, lng: location.longitude };
  const apex: GeoJsonPoint = [apexOrigin.lng, apexOrigin.lat];
  const steps = 16;

  const features: GeoJsonFeatureCollection['features'] = [];

  for (let b = bands; b >= 1; b -= 1) {
    const r = radiusM * (b / bands);
    const arc: GeoJsonPoint[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const angle = heading - halfAngleDeg + 2 * halfAngleDeg * t;
      const p = destinationPoint(apexOrigin.lat, apexOrigin.lng, angle, r);
      arc.push([p.lng, p.lat]);
    }
    const ring: GeoJsonPoint[] = [apex, ...arc, apex];
    features.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

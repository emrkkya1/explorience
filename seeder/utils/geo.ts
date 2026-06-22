export interface Coordinates {
  lat: number;
  lng: number;
}

export function haversineDistance(p1: Coordinates, p2: Coordinates): number {
  const R = 6371000;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeGridId(lat: number, lng: number): string {
  return `${(Math.floor(lat * 1000) / 1000).toFixed(3)},${(Math.floor(lng * 1000) / 1000).toFixed(3)}`;
}

export function computeCellRadius(north: number, south: number, east: number, west: number): number {
  const centerLat = (north + south) / 2;
  const centerLng = (east + west) / 2;
  return haversineDistance({ lat: centerLat, lng: centerLng }, { lat: north, lng: east });
}

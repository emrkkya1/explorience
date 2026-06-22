import { View, Text } from 'react-native';

import type { PlayerLocation } from '@/types/FogOfWar';
import { latLngToBitIndex } from '@/lib/bitmap/mapping';

type CityBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type DebugOverlayProps = {
  location: PlayerLocation | null;
  rectangleCount: number;
  hintedPoiCount: number;
  discoveredPoiCount: number;
  nearbyPoiCount: number;
  permissionStatus: 'undetermined' | 'granted' | 'denied' | 'loading';
  locationError: string | null;
  bounds: CityBounds | null;
  gridWidth?: number;
  gridHeight?: number;
};

export function DebugOverlay({
  location,
  rectangleCount,
  hintedPoiCount,
  discoveredPoiCount,
  nearbyPoiCount,
  permissionStatus,
  locationError,
  bounds,
  gridWidth,
  gridHeight,
}: DebugOverlayProps) {
  const bitIndex = location && bounds && gridWidth != null && gridHeight != null
    ? latLngToBitIndex(location.latitude, location.longitude, bounds, gridWidth, gridHeight)
    : -1;
  const inBounds = bitIndex >= 0;

  return (
    <View
      style={{
        position: 'absolute',
        top: 50,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 10,
        borderRadius: 8,
        zIndex: 1000,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 12 }}>Permission: {permissionStatus}</Text>
      {locationError && <Text style={{ color: '#ff6b6b', fontSize: 12 }}>Error: {locationError}</Text>}
      <Text style={{ color: '#fff', fontSize: 12 }}>Bit Index: {bitIndex}</Text>
      <Text style={{ color: inBounds ? '#fff' : '#ff6b6b', fontSize: 12 }}>
        In Bounds: {bounds ? (inBounds ? 'Yes' : 'No') : 'N/A'}
      </Text>
      <Text style={{ color: '#fff', fontSize: 12 }}>Rectangles: {rectangleCount}</Text>
      <Text style={{ color: '#fff', fontSize: 12 }}>Hinted POIs: {hintedPoiCount}</Text>
      <Text style={{ color: '#fff', fontSize: 12 }}>Discovered POIs: {discoveredPoiCount}</Text>
      <Text style={{ color: '#fff', fontSize: 12 }}>Nearby (hint range): {nearbyPoiCount}</Text>
      <Text style={{ color: '#fff', fontSize: 12 }}>Heading: {location?.heading?.toFixed(0) ?? 'N/A'}°</Text>
    </View>
  );
}

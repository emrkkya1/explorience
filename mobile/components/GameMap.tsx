import Mapbox from '@rnmapbox/maps';
import { StyleSheet } from 'react-native';
import { useMemo, useState } from 'react';

import { View } from '@/tw';
import { CITIES } from '@/constants/Cities';
import { usePois } from '@/components/usePois';
import { usePlayerLocation } from '@/components/usePlayerLocation';
import { useFogOfWar } from '@/components/useFogOfWar';
import { usePoiDiscovery } from '@/components/usePoiDiscovery';
import { FogOfWarLayer } from '@/components/FogOfWarLayer';
import { FogColorPicker } from '@/components/FogColorPicker';
import { PoiLayer } from '@/components/PoiLayer';
import { PlayerMarker } from '@/components/PlayerMarker';
import { DebugOverlay } from '@/components/DebugOverlay';
import { getPoisInRadius } from '@/lib/geo';
import { FOG_CONFIG } from '@/constants/FogOfWar';
import { CELL_SIZE } from '@/lib/bitmap/mapping';
import { DEFAULT_FOG_COLOR } from '@/constants/FogColors';

type GameMapProps = {
  cityName: string;
  cityId: number;
  gameId: string;
  playerId: string;
};

export function GameMap({ cityName, cityId, gameId, playerId }: GameMapProps) {
  const city = CITIES.find((c) => c.name === cityName) ?? CITIES[0];

  const { gridWidth, gridHeight } = city;
  const bounds = useMemo(() => ({
    north: city.north,
    west: city.west,
    east: city.west + gridWidth * CELL_SIZE,
    south: city.north - gridHeight * CELL_SIZE,
  }), [city.north, city.west, gridWidth, gridHeight]);

  const [fogColorId, setFogColorId] = useState(DEFAULT_FOG_COLOR.id);

  const { pois } = usePois(cityId);
  const { location, error: locationError, loading: locationLoading, permissionStatus } = usePlayerLocation();
  const { rectangles } = useFogOfWar(gameId, playerId, location, bounds, gridWidth, gridHeight);
  const { hintedPoiIds, discoveredPoiIds } = usePoiDiscovery(gameId, playerId, location, pois);

  const nearbyPoiCount = location
    ? getPoisInRadius(pois, location, FOG_CONFIG.POI_HINT_RADIUS_METERS).length
    : 0;

  if (locationLoading && permissionStatus === 'loading') {
    return (
      <View className="flex-1 items-center justify-center">
        <View
          style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: 20,
            borderRadius: 12,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              borderWidth: 3,
              borderColor: '#fff',
              borderTopColor: 'transparent',
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Mapbox.MapView
        style={StyleSheet.absoluteFill}
        styleURL={Mapbox.StyleURL.Light}
        logoEnabled={false}
        scaleBarEnabled={false}
        attributionEnabled={false}
      >
        <Mapbox.Camera
          defaultSettings={{
            zoomLevel: 14,
            centerCoordinate: [city.longitude, city.latitude],
          }}
          minZoomLevel={12}
          maxZoomLevel={18}
          maxBounds={{
            ne: [bounds.east, bounds.north],
            sw: [bounds.west, bounds.south],
          }}
          followUserLocation={true}
        />

        <FogOfWarLayer rectangles={rectangles} bounds={bounds} fogColorId={fogColorId} />

        <PoiLayer pois={pois} hintedIds={hintedPoiIds} discoveredIds={discoveredPoiIds} />

        {location && (
          <Mapbox.PointAnnotation
            id="player-location"
            coordinate={[location.longitude, location.latitude]}
          >
            <PlayerMarker heading={location.heading} />
          </Mapbox.PointAnnotation>
        )}
      </Mapbox.MapView>

      <FogColorPicker selectedColorId={fogColorId} onSelect={setFogColorId} />

      <DebugOverlay
        location={location}
        rectangleCount={rectangles.length}
        hintedPoiCount={hintedPoiIds.size}
        discoveredPoiCount={discoveredPoiIds.size}
        nearbyPoiCount={nearbyPoiCount}
        permissionStatus={permissionStatus}
        locationError={locationError}
        bounds={bounds}
        gridWidth={gridWidth}
        gridHeight={gridHeight}
      />
    </View>
  );
}

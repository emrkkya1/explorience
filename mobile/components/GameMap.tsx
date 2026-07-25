import Mapbox from '@rnmapbox/maps';
import Svg, { Polygon, Text as SvgText } from 'react-native-svg';
import { ActivityIndicator, StyleSheet } from 'react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Colors from '@/constants/Colors';
import { View } from '@/tw';
import { CITIES } from '@/constants/Cities';
import { useColorScheme } from '@/components/useColorScheme';
import { usePois } from '@/components/usePois';
import { usePlayerLocation } from '@/components/usePlayerLocation';
import { useSmoothedHeading } from '@/components/useSmoothedHeading';
import { useFogOfWar } from '@/components/useFogOfWar';
import { usePoiDiscovery } from '@/components/usePoiDiscovery';
import { useViewedPois } from '@/components/useViewedPois';
import { usePlayers } from '@/components/usePlayers';
import { useMapPreferences } from '@/components/MapPreferencesContext';
import { useExploreFlow } from '@/components/useExploreFlow';
import { useBroadcastLocation } from '@/components/useBroadcastLocation';
import { usePlayerLocations } from '@/components/usePlayerLocations';
import { usePlayerColors } from '@/components/usePlayerColors';
import { FogOfWarLayer } from '@/components/FogOfWarLayer';
import { PoiLayer } from '@/components/PoiLayer';
import { DebugOverlay } from '@/components/DebugOverlay';
import { MapHeader } from '@/components/MapHeader';
import { BgEventsBadge } from '@/components/BgEventsBadge';
import { MapControls } from '@/components/MapControls';
import { ExploredSidebar } from '@/components/ExploredSidebar';
import { PoiDetailCard } from '@/components/PoiDetailCard';
import { PlayerListPopup } from '@/components/PlayerListPopup';
import { getPoisInRadius, buildVisionCone } from '@/lib/geo';
import { FOG_CONFIG, VISION_CONFIG } from '@/constants/FogOfWar';
import { CELL_SIZE } from '@/lib/bitmap/mapping';
import type { PoiRarity } from '@/types/Poi';

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

  const colorScheme = useColorScheme();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const { fogColorId, showDebug, playerColor } = useMapPreferences();

  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [selectedRemotePlayerId, setSelectedRemotePlayerId] = useState<string | null>(null);
  const [labelOpacity, setLabelOpacity] = useState(1);

  const { pois } = usePois(cityId);
  const { players } = usePlayers(gameId);
  const { location, heading, error: locationError, loading: locationLoading, permissionStatus } = usePlayerLocation();
  const smoothedHeading = useSmoothedHeading(heading);
  const { rectangles } = useFogOfWar(gameId, playerId, location, bounds, gridWidth, gridHeight);
  const { hintedPoiIds, discoveredPoiIds, exploredStates } = usePoiDiscovery(gameId, playerId, location, pois);
  const { viewedIds, markViewed } = useViewedPois(gameId);
  const { startExplore } = useExploreFlow({ gameId, playerId });
  useBroadcastLocation(gameId, playerId, location);
  const { locations: remotePlayerLocations } = usePlayerLocations(gameId, playerId);
  const playerColors = usePlayerColors(remotePlayerLocations, playerColor);

  const playerUsernameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of players) {
      map.set(p.id, p.username);
    }
    return map;
  }, [players]);

  useEffect(() => {
    if (!selectedRemotePlayerId) {
      setLabelOpacity(1);
      return;
    }

    setLabelOpacity(1);
    const startTime = Date.now();
    const duration = 3000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setLabelOpacity(1 - progress);
      if (progress >= 1) {
        clearInterval(interval);
        setSelectedRemotePlayerId(null);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [selectedRemotePlayerId]);

  useEffect(() => {
    if (selectedPoiId && discoveredPoiIds.has(selectedPoiId)) {
      markViewed(selectedPoiId);
    }
  }, [selectedPoiId, discoveredPoiIds, markViewed]);

  const discoveredPois = useMemo(
    () => pois.filter((poi) => discoveredPoiIds.has(poi.id)),
    [pois, discoveredPoiIds]
  );

  const exploredPois = useMemo(
    () => pois.filter((poi) => exploredStates.get(poi.id)?.explored),
    [pois, exploredStates]
  );

  const rarityDiscovered = useMemo(() => {
    const counts: Record<PoiRarity, number> = { legendary: 0, epic: 0, rare: 0, common: 0 };
    discoveredPois.forEach((poi) => {
      counts[poi.rarity] += 1;
    });
    return counts;
  }, [discoveredPois]);

  const rarityTotal = useMemo(() => {
    const counts: Record<PoiRarity, number> = { legendary: 0, epic: 0, rare: 0, common: 0 };
    pois.forEach((poi) => {
      counts[poi.rarity] += 1;
    });
    return counts;
  }, [pois]);

  const selectedPoi = useMemo(
    () => pois.find((poi) => poi.id === selectedPoiId) ?? null,
    [pois, selectedPoiId]
  );

  const selectedExploredState = selectedPoi
    ? exploredStates.get(selectedPoi.id) ?? null
    : null;

  const nearbyPoiCount = location
    ? getPoisInRadius(pois, location, FOG_CONFIG.POI_HINT_RADIUS_METERS).length
    : 0;

  const visionCone = useMemo(
    () => (location
      ? buildVisionCone(
          location,
          smoothedHeading ?? 0,
          VISION_CONFIG.RADIUS_METERS,
          VISION_CONFIG.HALF_ANGLE_DEG,
          VISION_CONFIG.LEAD_DISTANCE_M,
          VISION_CONFIG.BANDS
        )
      : null),
    [location, smoothedHeading]
  );

  const handlePoiSelect = (poiId: string) => {
    setSelectedPoiId(poiId);
  };

  const [followUser, setFollowUser] = useState(true);
  const [followMode, setFollowMode] = useState<'normal' | 'compass'>('normal');

  const locationRef = useRef(location);
  const isAnimatingRef = useRef(false);
  const followUserRef = useRef(followUser);
  const followTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    followUserRef.current = followUser;
  }, [followUser]);

  useEffect(() => {
    return () => {
      if (followTimeoutRef.current !== null) {
        clearTimeout(followTimeoutRef.current);
      }
    };
  }, []);

  const handleCenterPlayer = useCallback(() => {
    const latestLocation = locationRef.current;
    if (!latestLocation || !cameraRef.current || isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    if (followTimeoutRef.current !== null) {
      clearTimeout(followTimeoutRef.current);
    }

    setFollowUser(false);

    cameraRef.current.setCamera({
      centerCoordinate: [latestLocation.longitude, latestLocation.latitude],
      heading: 0,
      animationDuration: 600,
      animationMode: 'easeTo',
    });

    followTimeoutRef.current = setTimeout(() => {
      setFollowMode('normal');
      setFollowUser(true);
      isAnimatingRef.current = false;
      followTimeoutRef.current = null;
    }, 650);
  }, []);

  if (locationLoading && permissionStatus === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-bg dark:bg-bg-dark">
        <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Mapbox.MapView
        style={StyleSheet.absoluteFill}
        styleURL={colorScheme === 'dark' ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Light}
        logoEnabled={false}
        scaleBarEnabled={false}
        attributionEnabled={false}
        onCameraChanged={(state) => {
          if (state.gestures.isGestureActive && followUserRef.current) {
            setFollowUser(false);
          }
        }}
      >
        <Mapbox.Camera
          ref={cameraRef}
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
          followUserLocation={followUser}
          followUserMode={followMode}
        />

        <FogOfWarLayer rectangles={rectangles} bounds={bounds} fogColorId={fogColorId} />

        {location && (
          <>
            {visionCone && (
              <Mapbox.ShapeSource id="vision-cone-source" shape={visionCone}>
                <Mapbox.FillLayer
                  id="vision-cone-fill"
                  style={{
                    fillColor: playerColor,
                    fillOpacity: VISION_CONFIG.OPACITY,
                  }}
                />
              </Mapbox.ShapeSource>
            )}
            <Mapbox.Images key={`player-img-${playerColor}`}>
              <Mapbox.Image name="player-marker">
                <Svg width={36} height={36} viewBox="0 0 36 36">
                  <Polygon
                    points="18,2 33,36 18,26 3,36"
                    fill={playerColor}
                    stroke="#FFFFFF"
                    strokeWidth={2.5}
                  />
                </Svg>
              </Mapbox.Image>
            </Mapbox.Images>
            <Mapbox.ShapeSource
              id="player-location-source"
              shape={{
                type: 'FeatureCollection',
                features: [{
                  type: 'Feature',
                  geometry: { type: 'Point', coordinates: [location.longitude, location.latitude] },
                  properties: {},
                }],
              }}
            >
              <Mapbox.SymbolLayer
                id="player-location-triangle"
                style={{
                  iconImage: 'player-marker',
                  iconSize: ['step', ['zoom'], 0.4, 13, 0.55, 15, 0.75, 17, 1.0],
                  iconAnchor: 'bottom',
                  iconOffset: [0, 10],
                  iconRotate: smoothedHeading ?? 0,
                  iconAllowOverlap: true,
                  iconRotationAlignment: 'map',
                }}
              />
            </Mapbox.ShapeSource>
          </>
        )}

        {Array.from(remotePlayerLocations.entries()).map(([remotePlayerId, remoteLoc]) => {
          const color = playerColors.get(remotePlayerId) ?? '#888888';
          const username = playerUsernameMap.get(remotePlayerId) ?? '';
          const isSelected = selectedRemotePlayerId === remotePlayerId;
          const markerName = `remote-marker-${remotePlayerId}`;
          const labelName = `remote-label-${remotePlayerId}`;

          return (
            <React.Fragment key={`remote-player-${remotePlayerId}`}>
              <Mapbox.Images key={`remote-img-${remotePlayerId}-${color}`}>
                <Mapbox.Image name={markerName}>
                  <Svg width={28} height={28} viewBox="0 0 28 28">
                    <Polygon
                      points="14,2 26,28 14,22 2,28"
                      fill={color}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  </Svg>
                </Mapbox.Image>
                {isSelected && (
                  <Mapbox.Image name={labelName}>
                    <Svg width={150} height={20} viewBox="0 0 150 20">
                      <SvgText
                        x={75}
                        y={14}
                        textAnchor="middle"
                        fontSize={12}
                        fontWeight="bold"
                        fill={color}
                      >
                        {username}
                      </SvgText>
                    </Svg>
                  </Mapbox.Image>
                )}
              </Mapbox.Images>
              <Mapbox.ShapeSource
                id={`remote-player-source-${remotePlayerId}`}
                shape={{
                  type: 'FeatureCollection',
                  features: [{
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [remoteLoc.longitude, remoteLoc.latitude] },
                    properties: { playerId: remotePlayerId },
                  }],
                }}
                hitbox={{ width: 40, height: 40 }}
                onPress={() => {
                  setSelectedRemotePlayerId((prev) => (prev === remotePlayerId ? null : remotePlayerId));
                }}
              >
                <Mapbox.SymbolLayer
                  id={`remote-player-symbol-${remotePlayerId}`}
                  style={{
                    iconImage: markerName,
                    iconSize: ['step', ['zoom'], 0.5, 13, 0.7, 15, 0.9, 17, 1.1],
                    iconAnchor: 'bottom',
                    iconOffset: [0, 10],
                    iconRotate: remoteLoc.heading ?? 0,
                    iconAllowOverlap: true,
                    iconRotationAlignment: 'map',
                  }}
                />
              </Mapbox.ShapeSource>
              {isSelected && (
                <Mapbox.ShapeSource
                  id={`remote-label-source-${remotePlayerId}`}
                  shape={{
                    type: 'FeatureCollection',
                    features: [{
                      type: 'Feature',
                      geometry: { type: 'Point', coordinates: [remoteLoc.longitude, remoteLoc.latitude] },
                      properties: {},
                    }],
                  }}
                >
                  <Mapbox.SymbolLayer
                    id={`remote-label-symbol-${remotePlayerId}`}
                    style={{
                      iconImage: labelName,
                      iconSize: ['step', ['zoom'], 0.6, 13, 0.8, 15, 1.0, 17, 1.2],
                      iconAnchor: 'center',
                      iconOffset: [0, -25],
                      iconAllowOverlap: true,
                      iconRotationAlignment: 'viewport',
                      iconOpacity: labelOpacity,
                    }}
                  />
                </Mapbox.ShapeSource>
              )}
            </React.Fragment>
          );
        })}

        <PoiLayer
          pois={pois}
          hintedIds={hintedPoiIds}
          discoveredIds={discoveredPoiIds}
          onPoiSelect={handlePoiSelect}
        />
      </Mapbox.MapView>

      <MapHeader discovered={rarityDiscovered} total={rarityTotal} cityName={cityName} />

      <BgEventsBadge gameId={gameId} />

      <MapControls
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenPlayers={() => setPlayersOpen(true)}
        onCenterPlayer={handleCenterPlayer}
      />

      <ExploredSidebar
        visible={sidebarOpen}
        discoveredPois={discoveredPois}
        exploredPois={exploredPois}
        viewedIds={viewedIds}
        onClose={() => setSidebarOpen(false)}
        onSelectPoi={handlePoiSelect}
      />

      <PoiDetailCard
        visible={selectedPoiId !== null}
        poi={selectedPoi}
        exploredState={selectedExploredState}
        onExplore={(poi) => startExplore(poi)}
        onClose={() => setSelectedPoiId(null)}
      />

      <PlayerListPopup
        visible={playersOpen}
        players={players}
        remotePlayerLocations={remotePlayerLocations}
        localPlayerId={playerId}
        onClose={() => setPlayersOpen(false)}
        onSelectPlayer={(player) => {
          setPlayersOpen(false);
          const remoteLoc = remotePlayerLocations.get(player.id);
          if (!remoteLoc || !cameraRef.current) return;
          cameraRef.current.setCamera({
            centerCoordinate: [remoteLoc.longitude, remoteLoc.latitude],
            animationDuration: 600,
            animationMode: 'easeTo',
          });
        }}
      />

      {showDebug && (
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
      )}
    </View>
  );
}

import { View } from 'react-native';
import Mapbox from '@rnmapbox/maps';

import type { PoiCategory, PoiRarity } from '@/types/Poi';
import type { Poi } from '@/types/Poi';
import { HintMarkerIcon } from './PoiMarkerIcon';
import { PoiCategoryIcon } from './PoiCategoryIcon';
import { RARITY_COLORS } from '@/constants/Rarity';

type PoiLayerProps = {
  pois: Poi[];
  hintedIds: Set<string>;
  discoveredIds: Set<string>;
  onPoiSelect: (poiId: string) => void;
};

const CATEGORIES: PoiCategory[] = ['nightlife', 'food', 'landmark', 'history', 'nature', 'shopping', 'miscellaneous'];

export function PoiLayer({ pois, hintedIds, discoveredIds, onPoiSelect }: PoiLayerProps) {
  const hintedPois = pois.filter((poi) => hintedIds.has(poi.id) && !discoveredIds.has(poi.id));
  const discoveredPois = pois.filter((poi) => discoveredIds.has(poi.id));

  const hintedGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: hintedPois.map((poi) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [poi.longitude, poi.latitude] },
      properties: { id: poi.id },
    })),
  };

  const discoveredGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: discoveredPois.map((poi) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [poi.longitude, poi.latitude] },
      properties: { id: poi.id, rarity: poi.rarity, category: poi.category },
    })),
  };

  return (
    <>
      <Mapbox.Images>
        {CATEGORIES.map((category) => (
          <Mapbox.Image key={`icon-${category}`} name={`icon-${category}`}>
            <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <PoiCategoryIcon category={category} size={18} color="#FFFFFF" />
            </View>
          </Mapbox.Image>
        ))}
        <Mapbox.Image name="icon-hint">
          <HintMarkerIcon />
        </Mapbox.Image>
      </Mapbox.Images>

      <Mapbox.ShapeSource
        key={`hinted-${hintedPois.length}`}
        id="hinted-pois"
        shape={hintedGeoJSON}>
        <Mapbox.SymbolLayer
          id="hinted-poi-icons"
          style={{
            iconImage: 'icon-hint',
            iconSize: ['step', ['zoom'], 0.8, 12, 1.0, 14, 1.2, 16, 1.4],
            iconAllowOverlap: true,
            iconAnchor: 'center',
          }}
        />
      </Mapbox.ShapeSource>

      <Mapbox.ShapeSource
        key={`discovered-${discoveredPois.length}`}
        id="discovered-pois"
        shape={discoveredGeoJSON}
        hitbox={{ width: 50, height: 50 }}
        onPress={(e) => {
        const feature = e.features[0];
        const id = feature?.properties?.id;
        if (typeof id === 'string') onPoiSelect(id);
      }}>
        <Mapbox.CircleLayer
          id="discovered-poi-circles"
          style={{
            circleRadius: [
              'step', ['zoom'],
              4, 13, 7, 15, 10, 17, 14,
            ],
            circleColor: [
              'match', ['get', 'rarity'],
              'legendary', RARITY_COLORS.legendary,
              'epic', RARITY_COLORS.epic,
              'rare', RARITY_COLORS.rare,
              'common', RARITY_COLORS.common,
              RARITY_COLORS.common,
            ],
            circleStrokeWidth: 2,
            circleStrokeColor: '#FFFFFF',
          }}
        />
        <Mapbox.CircleLayer
          id="discovered-poi-glow"
          filter={['in', ['get', 'rarity'], ['literal', ['legendary', 'epic']]]}
          style={{
            circleRadius: [
              'step', ['zoom'],
              8, 13, 12, 15, 16, 17, 20,
            ],
            circleColor: [
              'match', ['get', 'rarity'],
              'legendary', 'rgba(212, 168, 67, 0.25)',
              'epic', 'rgba(155, 89, 182, 0.25)',
              'transparent',
            ],
            circleOpacity: 0.6,
          }}
        />
        <Mapbox.SymbolLayer
          id="discovered-poi-icons"
          style={{
            iconImage: [
              'match', ['get', 'category'],
              'nightlife', 'icon-nightlife',
              'food', 'icon-food',
              'landmark', 'icon-landmark',
              'history', 'icon-history',
              'nature', 'icon-nature',
              'shopping', 'icon-shopping',
              'miscellaneous', 'icon-miscellaneous',
              'icon-miscellaneous',
            ],
            iconSize: [
              'step', ['zoom'],
              0, 13, 0, 15, 0.5, 17, 0.85,
            ],
            iconAllowOverlap: true,
          }}
        />
      </Mapbox.ShapeSource>
    </>
  );
}

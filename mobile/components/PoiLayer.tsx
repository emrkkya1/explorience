import Mapbox from '@rnmapbox/maps';
import { View } from 'react-native';
import { Moon, UtensilsCrossed, Landmark, ScrollText, TreePine, ShoppingBag, MapPin, HelpCircle } from 'lucide-react-native';

import type { Poi } from '@/types/Poi';

type PoiLayerProps = {
  pois: Poi[];
  hintedIds: Set<string>;
  discoveredIds: Set<string>;
};

function CategoryIcon({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <Mapbox.Image name={name}>
      <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </Mapbox.Image>
  );
}

export function PoiLayer({ pois, hintedIds, discoveredIds }: PoiLayerProps) {
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
        <CategoryIcon name="icon-nightlife"><Moon size={18} color="#FFFFFF" strokeWidth={2.5} /></CategoryIcon>
        <CategoryIcon name="icon-food"><UtensilsCrossed size={18} color="#FFFFFF" strokeWidth={2.5} /></CategoryIcon>
        <CategoryIcon name="icon-landmark"><Landmark size={18} color="#FFFFFF" strokeWidth={2.5} /></CategoryIcon>
        <CategoryIcon name="icon-history"><ScrollText size={18} color="#FFFFFF" strokeWidth={2.5} /></CategoryIcon>
        <CategoryIcon name="icon-nature"><TreePine size={18} color="#FFFFFF" strokeWidth={2.5} /></CategoryIcon>
        <CategoryIcon name="icon-shopping"><ShoppingBag size={18} color="#FFFFFF" strokeWidth={2.5} /></CategoryIcon>
        <CategoryIcon name="icon-misc"><MapPin size={18} color="#FFFFFF" strokeWidth={2.5} /></CategoryIcon>
        <CategoryIcon name="icon-hint"><HelpCircle size={16} color="#1A1A1A" strokeWidth={3} /></CategoryIcon>
      </Mapbox.Images>

      <Mapbox.ShapeSource id="hinted-pois" shape={hintedGeoJSON}>
        <Mapbox.CircleLayer
          id="hinted-poi-circles"
          style={{
            circleRadius: 14,
            circleColor: '#D4A843',
            circleStrokeWidth: 2,
            circleStrokeColor: '#FFFFFF',
            circleOpacity: 0.9,
          }}
        />
        <Mapbox.SymbolLayer
          id="hinted-poi-icons"
          style={{
            iconImage: 'icon-hint',
            iconSize: 1.0,
            iconAllowOverlap: true,
          }}
        />
      </Mapbox.ShapeSource>

      <Mapbox.ShapeSource id="discovered-pois" shape={discoveredGeoJSON}>
        <Mapbox.CircleLayer
          id="discovered-poi-circles"
          style={{
            circleRadius: 12,
            circleColor: [
              'match', ['get', 'rarity'],
              'legendary', '#FFD700',
              'epic', '#9B59B6',
              'rare', '#3498DB',
              'common', '#95A5A6',
              '#95A5A6',
            ],
            circleStrokeWidth: 2,
            circleStrokeColor: '#FFFFFF',
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
              'icon-misc',
            ],
            iconSize: 0.85,
            iconAllowOverlap: true,
          }}
        />
      </Mapbox.ShapeSource>
    </>
  );
}

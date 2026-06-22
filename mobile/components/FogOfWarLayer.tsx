import { useMemo } from 'react';
import Mapbox from '@rnmapbox/maps';

import type { Rectangle } from '@/lib/bitmap/rectangles';
import type { CityBounds } from '@/lib/geo';
import { CELL_SIZE } from '@/lib/bitmap/mapping';

const FOG_TEXTURES: Record<string, number> = {
  teal: require('../assets/images/fog-teal.png'),
  navy: require('../assets/images/fog-navy.png'),
  forest: require('../assets/images/fog-forest.png'),
  amethyst: require('../assets/images/fog-amethyst.png'),
  ember: require('../assets/images/fog-ember.png'),
};

type FogOfWarLayerProps = {
  rectangles: Rectangle[];
  bounds: CityBounds;
  fogColorId: string;
};

function rectToRing(rect: { x: number; y: number; width: number; height: number }, bounds: CityBounds) {
  const west = bounds.west + rect.x * CELL_SIZE;
  const south = bounds.south + rect.y * CELL_SIZE;
  const east = west + rect.width * CELL_SIZE;
  const north = south + rect.height * CELL_SIZE;
  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];
}

export function FogOfWarLayer({ rectangles, bounds, fogColorId }: FogOfWarLayerProps) {
  const fogGeoJSON = useMemo(() => {
    const outerRing = [
      [bounds.west, bounds.south],
      [bounds.east, bounds.south],
      [bounds.east, bounds.north],
      [bounds.west, bounds.north],
      [bounds.west, bounds.south],
    ];

    const holes = rectangles.map((rect) => rectToRing(rect, bounds));

    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'Polygon' as const,
            coordinates: [outerRing, ...holes],
          },
        },
      ],
    };
  }, [rectangles, bounds]);

  return (
    <>
      <Mapbox.Images images={{ 'fog-texture': FOG_TEXTURES[fogColorId] || FOG_TEXTURES.teal }} />

      <Mapbox.ShapeSource id="fog" shape={fogGeoJSON}>
        <Mapbox.FillLayer
          id="fog-fill"
          style={{
            fillOpacity: 0.7,
            fillPattern: 'fog-texture',
          }}
        />
      </Mapbox.ShapeSource>
    </>
  );
}

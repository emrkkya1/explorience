import Mapbox from '@rnmapbox/maps';

export function initializeMapbox() {
  Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');
}

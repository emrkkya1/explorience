import Mapbox from '@rnmapbox/maps';
import Logger from '@rnmapbox/maps/lib/module/utils/Logger';

export function initializeMapbox() {
  Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

  Logger.setLogCallback((log: { level: string; tag: string; message: string }) => {
    if (log.message && log.message.includes('expected a single subview')) {
      return true;
    }
    return false;
  });
}

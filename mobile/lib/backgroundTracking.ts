import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

import { FOG_CONFIG } from '@/constants/FogOfWar';
import { CITIES } from '@/constants/Cities';
import { CELL_SIZE } from '@/lib/bitmap/mapping';
import { getActiveSession } from '@/lib/sessionStore';
import {
  setBgTrackingContext,
  setBgTrackingEnabled,
  type BgTrackingContext,
} from '@/lib/bgTrackingState';
import { setLastForegroundedAt } from '@/lib/bgEventsLedger';
import { BG_LOCATION_TASK } from '@/lib/backgroundLocationTask';

// Build the persisted ctx from the active session. Reused by the start
// helper and by useGameSession (via its own copy — duplicated intentionally
// to keep this module leaf-of-the-dep graph).
async function buildCtxFromActiveSession(): Promise<BgTrackingContext> {
  const session = await getActiveSession();
  if (!session) throw new Error('no-active-session');
  const city = CITIES.find((c) => c.name === session.cityName) ?? CITIES[0];
  return {
    gameId: session.gameId,
    playerId: session.playerId,
    cityId: session.cityId,
    cityName: session.cityName,
    bounds: {
      north: city.north,
      south: city.north - city.gridHeight * CELL_SIZE,
      east: city.west + city.gridWidth * CELL_SIZE,
      west: city.west,
    },
    gridWidth: city.gridWidth,
    gridHeight: city.gridHeight,
  };
}

export async function startBackgroundTracking(): Promise<void> {
  // 1. Foreground first (Android requires order; iOS treats this as
  //    implicit).
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    throw new Error('foreground-denied');
  }
  // 2. Background permission.
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') {
    throw new Error('background-denied');
  }
  // 3. Notifications permission (used only on discovery; if denied,
  //    discovery still writes to Supabase, just no notification).
  const notif = await Notifications.getPermissionsAsync();
  if (!notif.granted && notif.canAskAgain) {
    await Notifications.requestPermissionsAsync();
  }
  // 4. Persist bg ctx so the task callback can read it.
  const ctx = await buildCtxFromActiveSession();
  await setBgTrackingContext(ctx);
  await setBgTrackingEnabled(true);
  await setLastForegroundedAt();
  // 5. Start the task.
  await Location.startLocationUpdatesAsync(BG_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: FOG_CONFIG.BACKGROUND_LOCATION_INTERVAL_MS,
    distanceInterval: FOG_CONFIG.BACKGROUND_LOCATION_DISTANCE_M,
    deferredUpdatesInterval: FOG_CONFIG.BACKGROUND_LOCATION_INTERVAL_MS,
    deferredUpdatesDistance: FOG_CONFIG.BACKGROUND_LOCATION_DISTANCE_M,
    foregroundService: {
      notificationTitle: 'Explorience',
      notificationBody: 'Recording your exploration while you explore.',
      killServiceOnDestroy: false,
    },
  });
  console.log('[BgTrack] started');
}

export async function stopBackgroundTracking(): Promise<void> {
  try {
    await Location.stopLocationUpdatesAsync(BG_LOCATION_TASK);
  } catch (e) {
    // Already stopped — ignore.
    console.warn('[BgTrack] stopLocationUpdates skipped', e);
  }
  await setBgTrackingEnabled(false);
  await setBgTrackingContext(null);
  console.log('[BgTrack] stopped');
}

export async function isTrackingRunning(): Promise<boolean> {
  return await Location.hasStartedLocationUpdatesAsync(BG_LOCATION_TASK);
}
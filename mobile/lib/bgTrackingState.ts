import AsyncStorage from '@react-native-async-storage/async-storage';

// Persisted session context the background location task reads on every
// callback (it has no React tree). Written/synced from useGameSession after
// game create/join, cleared on log out. Mirrors `StoredSession` plus the
// bounds/grid that fog/POI detection need.

const CTX_KEY = 'explorience_bg_tracking_ctx';
const TOGGLE_KEY = 'explorience_bg_tracking_enabled';

export type BgTrackingContext = {
  gameId: string;
  playerId: string;
  cityId: number;
  cityName: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  gridWidth: number;
  gridHeight: number;
};

export async function setBgTrackingContext(ctx: BgTrackingContext | null): Promise<void> {
  if (ctx === null) {
    await AsyncStorage.removeItem(CTX_KEY);
    return;
  }
  await AsyncStorage.setItem(CTX_KEY, JSON.stringify(ctx));
}

export async function getBgTrackingContext(): Promise<BgTrackingContext | null> {
  try {
    const raw = await AsyncStorage.getItem(CTX_KEY);
    return raw ? (JSON.parse(raw) as BgTrackingContext) : null;
  } catch {
    return null;
  }
}

export async function setBgTrackingEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await AsyncStorage.setItem(TOGGLE_KEY, 'true');
  } else {
    await AsyncStorage.removeItem(TOGGLE_KEY);
  }
}

export async function getBgTrackingEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(TOGGLE_KEY)) === 'true';
}
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ledger of POI events the background task fired while the app was
// backgrounded, surfaced to the user as the "Since you were away" badge on
// the next foreground resume. Deduped by poi_id; cleared on user dismiss.

const KEY = 'explorience_bg_events';
const FOREGROUND_KEY = 'explorience_bg_last_fg_at';

export type BgEventsLedger = {
  newHintPoiIds: string[];
  newDiscoveryPoiIds: string[];
  lastForegroundedAt: number;
};

export async function readBgEventsLedger(): Promise<BgEventsLedger | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BgEventsLedger) : null;
  } catch {
    return null;
  }
}

export async function appendBgEventsLedger(
  events: Partial<Pick<BgEventsLedger, 'newHintPoiIds' | 'newDiscoveryPoiIds'>>
): Promise<void> {
  const existing = await readBgEventsLedger();
  const hints = new Set<string>(existing?.newHintPoiIds ?? []);
  const discoveries = new Set<string>(existing?.newDiscoveryPoiIds ?? []);

  if (events.newHintPoiIds) {
    for (const id of events.newHintPoiIds) hints.add(id);
  }
  if (events.newDiscoveryPoiIds) {
    for (const id of events.newDiscoveryPoiIds) discoveries.add(id);
  }

  const ledger: BgEventsLedger = {
    newHintPoiIds: Array.from(hints),
    newDiscoveryPoiIds: Array.from(discoveries),
    lastForegroundedAt: existing?.lastForegroundedAt ?? 0,
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(ledger));
}

export async function clearBgEventsLedger(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export async function setLastForegroundedAt(): Promise<void> {
  const now = Date.now();
  await AsyncStorage.setItem(FOREGROUND_KEY, String(now));
  const existing = await readBgEventsLedger();
  if (existing) {
    existing.lastForegroundedAt = now;
    await AsyncStorage.setItem(KEY, JSON.stringify(existing));
  }
}
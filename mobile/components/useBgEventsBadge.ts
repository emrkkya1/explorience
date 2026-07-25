import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  readBgEventsLedger,
  clearBgEventsLedger,
  type BgEventsLedger,
} from '@/lib/bgEventsLedger';
import { readPoiCache } from '@/lib/poiCache';
import { getBgTrackingContext } from '@/lib/bgTrackingState';

export type BgBadgeState = {
  visible: boolean;
  hintCount: number;
  discoveryCount: number;
  hintNames: string[];
  discoveryNames: string[];
  dismiss: () => Promise<void>;
};

// Reads the bg-events ledger on mount and on each AppState 'active' resume,
// resolves POI names via the AsyncStorage POI cache, and exposes a dismiss()
// that wipes the ledger so the badge does not reappear for the same batch.
export function useBgEventsBadge(gameId: string | null): BgBadgeState {
  const [ledger, setLedger] = useState<BgEventsLedger | null>(null);
  const [names, setNames] = useState<{ hints: string[]; discoveries: string[] }>({
    hints: [],
    discoveries: [],
  });
  const [dismissed, setDismissed] = useState(false);

  const load = useCallback(async () => {
    if (!gameId) {
      setLedger(null);
      return;
    }
    const l = await readBgEventsLedger();
    if (!l || (l.newHintPoiIds.length === 0 && l.newDiscoveryPoiIds.length === 0)) {
      setLedger(null);
      return;
    }
    setLedger(l);
    setDismissed(false);
    const ctx = await getBgTrackingContext();
    const cityId = ctx?.cityId ?? null;
    let hintNames: string[] = [];
    let discoveryNames: string[] = [];
    if (cityId !== null) {
      const pois = await readPoiCache(cityId);
      const byId = new Map(pois.map((p) => [p.id, p.name]));
      hintNames = l.newHintPoiIds.map((id) => byId.get(id)).filter(Boolean) as string[];
      discoveryNames = l.newDiscoveryPoiIds.map((id) => byId.get(id)).filter(Boolean) as string[];
    }
    setNames({ hints: hintNames, discoveries: discoveryNames });
  }, [gameId]);

  useEffect(() => {
    void load();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void load();
    });
    return () => sub.remove();
  }, [load]);

  const dismiss = useCallback(async () => {
    await clearBgEventsLedger();
    setLedger(null);
    setDismissed(true);
  }, []);

  const hintCount = ledger?.newHintPoiIds.length ?? 0;
  const discoveryCount = ledger?.newDiscoveryPoiIds.length ?? 0;
  const visible = !dismissed && (hintCount > 0 || discoveryCount > 0);

  return {
    visible,
    hintCount,
    discoveryCount,
    hintNames: names.hints,
    discoveryNames: names.discoveries,
    dismiss,
  };
}
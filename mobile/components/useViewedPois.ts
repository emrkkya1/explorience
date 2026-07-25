import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const VIEWED_KEY_PREFIX = 'explorience_viewed_pois:';

export function useViewedPois(gameId: string) {
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  const storageKey = `${VIEWED_KEY_PREFIX}${gameId}`;

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (cancelled || !raw) return;
      try {
        const arr = JSON.parse(raw) as string[];
        setViewedIds(new Set(arr));
      } catch { /* ignore parse errors */ }
    });
    return () => { cancelled = true; };
  }, [storageKey]);

  const markViewed = useCallback(
    (poiId: string) => {
      setViewedIds((prev) => {
        if (prev.has(poiId)) return prev;
        const next = new Set(prev);
        next.add(poiId);
        AsyncStorage.setItem(storageKey, JSON.stringify([...next])).catch(() => {});
        return next;
      });
    },
    [storageKey]
  );

  return { viewedIds, markViewed };
}

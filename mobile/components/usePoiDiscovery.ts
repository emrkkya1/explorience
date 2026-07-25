import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { withAuthRetry } from '@/lib/auth';
import { markExploredAction } from '@/lib/poiDiscoveryActions';
import type { PlayerLocation } from '@/types/FogOfWar';
import type { Poi } from '@/types/Poi';
import type { PoiDiscoveryState } from '@/types/PoiDiscovery';
import { FOG_CONFIG } from '@/constants/FogOfWar';
import { detectPoiEvents } from '@/lib/poiDiscovery';
import { useCoalescedFlush } from '@/components/useCoalescedFlush';
import { useAppState } from '@/components/useAppState';

type PoiDiscoveryRow = {
  poi_id: string;
  player_id: string;
  explored: boolean;
  explored_at: string | null;
  explored_by: string | null;
  user_photo_uri: string | null;
};

export function usePoiDiscovery(
  gameId: string | null,
  playerId: string | null,
  location: PlayerLocation | null,
  pois: Poi[]
) {
  const [hintedPoiIds, setHintedPoiIds] = useState<Set<string>>(new Set());
  const [discoveredPoiIds, setDiscoveredPoiIds] = useState<Set<string>>(new Set());
  const [exploredStates, setExploredStates] = useState<Map<string, PoiDiscoveryState>>(new Map());
  const pendingHints = useRef<Set<string>>(new Set());
  const pendingPois = useRef<Set<string>>(new Set());
  const hintedPoiIdsRef = useRef<Set<string>>(new Set());
  const appState = useAppState();

  useEffect(() => {
    if (!gameId) return;

    let cancelled = false;

    (async () => {
      const [hintResult, poiResult] = await Promise.all([
        supabase.from('poi_hints').select('poi_id').eq('game_id', gameId),
        supabase
          .from('poi_discoveries')
          .select('poi_id, player_id, explored, explored_at, explored_by, user_photo_uri')
          .eq('game_id', gameId),
      ]);

      if (cancelled) return;

      if (hintResult.data) {
        const ids = new Set(hintResult.data.map((r) => r.poi_id));
        setHintedPoiIds(ids);
        hintedPoiIdsRef.current = ids;
      }
      if (poiResult.data) {
        const rows = poiResult.data as PoiDiscoveryRow[];
        setDiscoveredPoiIds(new Set(rows.map((r) => r.poi_id)));
        const exploredMap = new Map<string, PoiDiscoveryState>();
        for (const r of rows) {
          exploredMap.set(r.poi_id, {
            poi_id: r.poi_id,
            discovered_by: r.player_id,
            explored: r.explored,
            explored_at: r.explored_at,
            explored_by: r.explored_by,
            user_photo_uri: r.user_photo_uri,
          });
        }
        setExploredStates(exploredMap);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!gameId) return;
    if (appState !== 'active') {
      // Background: realtime channels paused; background location task
      // keeps writing poi_hints / poi_discoveries. Re-subscribes on foreground.
      return;
    }

    const topic = `realtime:poi-discovery:${gameId}`;

    // Remove any stale channel with the same topic (Strict Mode double-mount guard)
    const existing = supabase.getChannels().find((c) => c.topic === topic);
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase
      .channel(`poi-discovery:${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'poi_hints', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const newPoiId = (payload.new as { poi_id: string }).poi_id;
          setHintedPoiIds((prev) => {
            const next = new Set(prev);
            next.add(newPoiId);
            return next;
          });
          hintedPoiIdsRef.current.add(newPoiId);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'poi_discoveries', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const newPoiId = (payload.new as { poi_id: string }).poi_id;
          setDiscoveredPoiIds((prev) => {
            const next = new Set(prev);
            next.add(newPoiId);
            return next;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'poi_discoveries', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as PoiDiscoveryRow;
          setExploredStates((prev) => {
            const next = new Map(prev);
            next.set(row.poi_id, {
              poi_id: row.poi_id,
              discovered_by: row.player_id,
              explored: row.explored,
              explored_at: row.explored_at,
              explored_by: row.explored_by,
              user_photo_uri: row.user_photo_uri,
            });
            return next;
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [gameId, appState]);

  // Coalesced sync push
  const syncToServer = useCallback(async (gameId: string, playerId: string): Promise<boolean> => {
    const hints = Array.from(pendingHints.current);
    const pois = Array.from(pendingPois.current);

    console.log(`[PoiDiscovery] Sync attempt: ${hints.length} hints, ${pois.length} discoveries`);

    if (hints.length === 0 && pois.length === 0) return true;

    let hadError = false;

    if (hints.length > 0) {
      console.log(`[PoiDiscovery] Syncing hints:`, hints);
      const results = await Promise.all(
        hints.map((poi_id) =>
          withAuthRetry(async () => {
            const { error } = await supabase.rpc('upsert_poi_hint', {
              p_game_id: gameId,
              p_player_id: playerId,
              p_poi_id: poi_id,
            });
            if (error) throw error;
          }).catch((e) => e)
        )
      );
      const failures = results.filter((r) => r instanceof Error);
      if (failures.length > 0) {
        console.error('[PoiDiscovery] Hint sync errors (will retry):', failures);
        hadError = true;
      } else {
        console.log(`[PoiDiscovery] Hints synced successfully`);
        hints.forEach((h) => pendingHints.current.delete(h));
      }
    }

    if (pois.length > 0) {
      console.log(`[PoiDiscovery] Syncing discoveries:`, pois);
      const results = await Promise.all(
        pois.map((poi_id) =>
          withAuthRetry(async () => {
            const { error } = await supabase.rpc('upsert_poi_discovery', {
              p_game_id: gameId,
              p_player_id: playerId,
              p_poi_id: poi_id,
            });
            if (error) throw error;
          }).catch((e) => e)
        )
      );
      const failures = results.filter((r) => r instanceof Error);
      if (failures.length > 0) {
        console.error('[PoiDiscovery] POI sync errors (will retry):', failures);
        hadError = true;
      } else {
        console.log(`[PoiDiscovery] Discoveries synced successfully`);
        pois.forEach((p) => pendingPois.current.delete(p));
      }
    }

    return !hadError;
  }, []);

  const { schedule } = useCoalescedFlush(
    () => {
      if (!gameId || !playerId) return Promise.resolve(true);
      return syncToServer(gameId, playerId);
    },
    FOG_CONFIG.SYNC_COALESCE_MS
  );

  useEffect(() => {
    if (!location || !gameId || !playerId) return;

    const hintsBefore = pendingHints.current.size;
    const poisBefore = pendingPois.current.size;

    const { newHints, newDiscoveries } = detectPoiEvents(
      location,
      pois,
      hintedPoiIdsRef.current,
      discoveredPoiIds
    );

    if (newHints.length > 0) {
      console.log(`[PoiDiscovery] New hints detected:`, newHints.map((p) => p.id));
      setHintedPoiIds((prev) => {
        const next = new Set(prev);
        newHints.forEach((poi) => {
          if (!next.has(poi.id)) {
            next.add(poi.id);
            pendingHints.current.add(poi.id);
          }
        });
        hintedPoiIdsRef.current = next;
        return next;
      });
    }

    if (newDiscoveries.length > 0) {
      setDiscoveredPoiIds((prev) => {
        const next = new Set(prev);
        newDiscoveries.forEach((poi) => {
          if (!next.has(poi.id)) {
            next.add(poi.id);
            pendingPois.current.add(poi.id);
          }
        });
        return next;
      });
    }

    if (pendingHints.current.size > hintsBefore || pendingPois.current.size > poisBefore) {
      schedule();
    }
  }, [location, gameId, playerId, pois, schedule, discoveredPoiIds]);

  const markExplored = useCallback(
    async (
      poiGameId: string,
      poiPlayerId: string,
      poiId: string,
      userPhotoUri: string | null
    ): Promise<void> => {
      // Optimistic local update so subscribers see the flip immediately; the
      // Supabase realtime UPDATE channel will confirm it shortly after.
      setExploredStates((prev) => {
        const next = new Map(prev);
        const existing = next.get(poiId);
        next.set(poiId, {
          poi_id: poiId,
          discovered_by: existing?.discovered_by ?? poiPlayerId,
          explored: true,
          explored_at: new Date().toISOString(),
          explored_by: poiPlayerId,
          user_photo_uri: userPhotoUri,
        });
        return next;
      });
      try {
        await markExploredAction(poiGameId, poiPlayerId, poiId, userPhotoUri);
      } catch (err) {
        console.error('[PoiDiscovery] markExplored error:', err);
      }
    },
    []
  );

  return { hintedPoiIds, discoveredPoiIds, exploredStates, markExplored };
}

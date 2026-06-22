import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { PlayerLocation } from '@/types/FogOfWar';
import type { Poi } from '@/types/Poi';
import { FOG_CONFIG } from '@/constants/FogOfWar';
import { getPoisInRadius } from '@/lib/geo';

export function usePoiDiscovery(
  gameId: string | null,
  playerId: string | null,
  location: PlayerLocation | null,
  pois: Poi[]
) {
  const [hintedPoiIds, setHintedPoiIds] = useState<Set<string>>(new Set());
  const [discoveredPoiIds, setDiscoveredPoiIds] = useState<Set<string>>(new Set());
  const pendingHints = useRef<Set<string>>(new Set());
  const pendingPois = useRef<Set<string>>(new Set());
  const lastSync = useRef<number>(0);
  const hintedPoiIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!gameId) return;

    let cancelled = false;

    (async () => {
      const [hintResult, poiResult] = await Promise.all([
        supabase.from('poi_hints').select('poi_id').eq('game_id', gameId),
        supabase.from('poi_discoveries').select('poi_id').eq('game_id', gameId),
      ]);

      if (cancelled) return;

      if (hintResult.data) {
        const ids = new Set(hintResult.data.map((r) => r.poi_id));
        setHintedPoiIds(ids);
        hintedPoiIdsRef.current = ids;
      }
      if (poiResult.data) {
        setDiscoveredPoiIds(new Set(poiResult.data.map((r) => r.poi_id)));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!gameId) return;

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
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [gameId]);

  useEffect(() => {
    if (!location || !gameId || !playerId) return;

    // Stage 1: Hint detection (100m radius)
    const nearbyPois = getPoisInRadius(pois, location, FOG_CONFIG.POI_HINT_RADIUS_METERS);
    if (nearbyPois.length > 0) {
      const newHints = nearbyPois.filter((poi) => !hintedPoiIdsRef.current.has(poi.id));
      if (newHints.length > 0) {
        console.log(`[PoiDiscovery] New hints detected:`, newHints.map(p => p.id));
      }
      setHintedPoiIds((prev) => {
        const next = new Set(prev);
        nearbyPois.forEach((poi) => {
          if (!next.has(poi.id)) {
            next.add(poi.id);
            pendingHints.current.add(poi.id);
          }
        });
        return next;
      });
    }

    // Stage 2: Discovery (20m radius, only for hinted POIs)
    const closePois = getPoisInRadius(pois, location, FOG_CONFIG.POI_DISCOVER_RADIUS_METERS);
    const discoverablePois = closePois.filter((poi) => hintedPoiIdsRef.current.has(poi.id));
    if (discoverablePois.length > 0) {
      setDiscoveredPoiIds((prev) => {
        const next = new Set(prev);
        discoverablePois.forEach((poi) => {
          if (!next.has(poi.id)) {
            next.add(poi.id);
            pendingPois.current.add(poi.id);
          }
        });
        return next;
      });
    }

    const now = Date.now();
    if (now - lastSync.current >= FOG_CONFIG.SYNC_INTERVAL_MS) {
      syncToServer(gameId, playerId);
      lastSync.current = now;
    }
  }, [location, gameId, playerId, pois]);

  const syncToServer = useCallback(async (gameId: string, playerId: string) => {
    const hints = Array.from(pendingHints.current);
    const pois = Array.from(pendingPois.current);

    console.log(`[PoiDiscovery] Sync attempt: ${hints.length} hints, ${pois.length} discoveries`);

    if (hints.length === 0 && pois.length === 0) return;

    if (hints.length > 0) {
      console.log(`[PoiDiscovery] Syncing hints:`, hints);
      const { error } = await supabase.from('poi_hints').upsert(
        hints.map((poi_id) => ({ game_id: gameId, player_id: playerId, poi_id })),
        { onConflict: 'game_id,poi_id' }
      );
      if (error) {
        console.error('[PoiDiscovery] Hint sync error (will retry):', error);
      } else {
        console.log(`[PoiDiscovery] Hints synced successfully`);
        hints.forEach((h) => pendingHints.current.delete(h));
      }
    }

    if (pois.length > 0) {
      console.log(`[PoiDiscovery] Syncing discoveries:`, pois);
      const { error } = await supabase.from('poi_discoveries').upsert(
        pois.map((poi_id) => ({ game_id: gameId, player_id: playerId, poi_id })),
        { onConflict: 'game_id,poi_id' }
      );
      if (error) {
        console.error('[PoiDiscovery] POI sync error (will retry):', error);
      } else {
        console.log(`[PoiDiscovery] Discoveries synced successfully`);
        pois.forEach((p) => pendingPois.current.delete(p));
      }
    }
  }, []);

  return { hintedPoiIds, discoveredPoiIds };
}

import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { PlayerLocation } from '@/types/FogOfWar';
import { FOG_CONFIG } from '@/constants/FogOfWar';
import {
  createBitmap,
  applyDeltas,
} from '@/lib/bitmap/core';
import { bitmapToRectangles, type Rectangle } from '@/lib/bitmap/rectangles';
import { getBitIndicesInRadius } from '@/lib/bitmap/mapping';
import { loadAndMergeBitmap } from '@/lib/bitmap/compaction';

type CityBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export function useFogOfWar(
  gameId: string | null,
  playerId: string | null,
  location: PlayerLocation | null,
  bounds: CityBounds | null,
  gridWidth: number,
  gridHeight: number
) {
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const bitmapRef = useRef<Uint8Array>(createBitmap(gridWidth, gridHeight));
  const deltaBuffer = useRef<number[]>([]);
  const lastSync = useRef<number>(0);
  const [initialized, setInitialized] = useState(false);

  // Load initial state on game join
  useEffect(() => {
    if (!gameId || !bounds || initialized) return;

    let cancelled = false;

    (async () => {
      console.log('[FogInit] Loading bitmap for game:', gameId);
      const bitmap = await loadAndMergeBitmap(gameId, gridWidth, gridHeight);

      if (cancelled) return;

      bitmapRef.current = bitmap;
      const rects = bitmapToRectangles(bitmap, gridWidth, gridHeight);
      console.log('[FogInit] Rectangles generated:', rects.length);
      if (rects.length > 0) {
        console.log('[FogInit] First rectangle:', rects[0]);
      }
      setRectangles(rects);
      setInitialized(true);
      console.log('[FogInit] Initialization complete');
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId, bounds]);

  // Realtime listener for deltas from other players
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const topic = `realtime:fog-deltas:${gameId}`;

    // Remove any stale channel with the same topic (Strict Mode double-mount guard)
    const existing = supabase.getChannels().find((c) => c.topic === topic);
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase
      .channel(`fog-deltas:${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fog_deltas', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const deltas = (payload.new as { deltas: number[] }).deltas;
          applyDeltas(bitmapRef.current, deltas);
          setRectangles(bitmapToRectangles(bitmapRef.current, gridWidth, gridHeight));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [gameId]);

  // Explore cells on location update
  useEffect(() => {
    if (!location || !bounds || !initialized) return;

    const newIndices = getBitIndicesInRadius(
      location.latitude,
      location.longitude,
      FOG_CONFIG.FOG_CLEAR_RADIUS_CELLS,
      bounds,
      gridWidth,
      gridHeight
    );

    const newBits: number[] = [];
    for (const idx of newIndices) {
      if (bitmapRef.current[idx] === 0) {
        newBits.push(idx);
      }
    }

    if (newBits.length > 0) {
      console.log('[FogExplore] New bits found:', newBits.length);
      applyDeltas(bitmapRef.current, newBits);
      setRectangles(bitmapToRectangles(bitmapRef.current, gridWidth, gridHeight));
      deltaBuffer.current.push(...newBits);
      console.log('[FogExplore] Delta buffer size:', deltaBuffer.current.length);
    }
  }, [location, bounds, initialized]);

  // Sync deltas every 3s
  const syncToServer = useCallback(async (gameId: string, playerId: string) => {
    const deltas = deltaBuffer.current;
    console.log('[FogSync] Checking sync:', { deltasCount: deltas.length, gameId, playerId });
    
    if (deltas.length === 0) return;

    deltaBuffer.current = [];

    console.log('[FogSync] Attempting insert:', { deltasCount: deltas.length });
    
    const { error } = await supabase.from('fog_deltas').insert({
      game_id: gameId,
      player_id: playerId,
      deltas,
    });

    if (error) {
      console.error('[FogSync] Insert failed:', error);
      deltaBuffer.current.push(...deltas);
    } else {
      console.log('[FogSync] Insert successful');
    }
  }, []);

  useEffect(() => {
    if (!gameId || !playerId || !initialized) {
      console.log('[FogSync] Interval not started:', { gameId, playerId, initialized });
      return;
    }

    console.log('[FogSync] Starting sync interval');
    
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastSync.current >= FOG_CONFIG.SYNC_INTERVAL_MS) {
        console.log('[FogSync] Interval tick, calling syncToServer');
        syncToServer(gameId, playerId);
        lastSync.current = now;
      }
    }, FOG_CONFIG.SYNC_INTERVAL_MS);

    return () => {
      console.log('[FogSync] Clearing interval');
      clearInterval(interval);
    };
  }, [gameId, playerId, initialized, syncToServer]);

  return { rectangles };
}

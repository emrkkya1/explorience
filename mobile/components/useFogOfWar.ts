import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { PlayerLocation } from '@/types/FogOfWar';
import { FOG_CONFIG } from '@/constants/FogOfWar';
import {
  createBitmap,
  applyDeltas,
} from '@/lib/bitmap/core';
import { exploreCellsAtLocation } from '@/lib/bitmap/fogExploration';
import { bitmapToRectangles, type Rectangle } from '@/lib/bitmap/rectangles';
import { loadAndMergeBitmap } from '@/lib/bitmap/compaction';
import { useCoalescedFlush } from '@/components/useCoalescedFlush';
import { useAppState } from '@/components/useAppState';

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
  const [initialized, setInitialized] = useState(false);
  const appState = useAppState();

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
    if (appState !== 'active') {
      // Background: realtime channel paused; background location task
      // keeps writing fog_deltas to Supabase. Re-subscribes on foreground.
      return;
    }

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
  }, [gameId, appState]);

  // Coalesced sync push
  const syncToServer = useCallback(async (gameId: string, playerId: string): Promise<boolean> => {
    const deltas = deltaBuffer.current;
    console.log('[FogSync] Checking sync:', { deltasCount: deltas.length, gameId, playerId });
    
    if (deltas.length === 0) return true;

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
      return false;
    }
    console.log('[FogSync] Insert successful');
    return true;
  }, []);

  const { schedule } = useCoalescedFlush(
    () => {
      if (!gameId || !playerId) return Promise.resolve(true);
      return syncToServer(gameId, playerId);
    },
    FOG_CONFIG.SYNC_COALESCE_MS
  );

  // Explore cells on location update
  useEffect(() => {
    if (!location || !bounds || !initialized) return;

    const newBits = exploreCellsAtLocation(
      location,
      bounds,
      gridWidth,
      gridHeight,
      bitmapRef.current
    );

    if (newBits.length > 0) {
      console.log('[FogExplore] New bits found:', newBits.length);
      setRectangles(bitmapToRectangles(bitmapRef.current, gridWidth, gridHeight));
      deltaBuffer.current.push(...newBits);
      console.log('[FogExplore] Delta buffer size:', deltaBuffer.current.length);
      if (gameId && playerId) schedule();
    }
  }, [location, bounds, initialized, schedule]);

  return { rectangles };
}

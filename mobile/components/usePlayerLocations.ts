import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAppState } from '@/components/useAppState';

export type RemotePlayerLocation = {
  playerId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  updatedAt: string;
};

type PlayerLocationRow = {
  player_id: string;
  game_id: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  accuracy: number | null;
  updated_at: string;
};

export function usePlayerLocations(
  gameId: string | null,
  localPlayerId: string | null
) {
  console.log('[PlayerLocations] Hook called', { gameId, localPlayerId });
  const [locations, setLocations] = useState<Map<string, RemotePlayerLocation>>(new Map());
  const appState = useAppState();

  const fetchLocations = useCallback(async (signal: { cancelled: boolean }) => {
    if (!gameId) return;

    console.log('[PlayerLocations] Fetching locations for game:', gameId);
    const { data, error } = await supabase
      .from('player_locations')
      .select('*')
      .eq('game_id', gameId);

    if (signal.cancelled || error || !data) {
      console.log('[PlayerLocations] Fetch failed or cancelled:', { error, signalCancelled: signal.cancelled });
      return;
    }

    console.log('[PlayerLocations] Received data:', data);
    const map = new Map<string, RemotePlayerLocation>();
    for (const row of data as PlayerLocationRow[]) {
      if (row.player_id === localPlayerId) continue;
      map.set(row.player_id, {
        playerId: row.player_id,
        latitude: row.latitude,
        longitude: row.longitude,
        heading: row.heading,
        updatedAt: row.updated_at,
      });
    }
    console.log('[PlayerLocations] Setting locations map:', map);
    setLocations(map);
  }, [gameId, localPlayerId]);

  useEffect(() => {
    console.log('[PlayerLocations] Effect 1 running', { gameId, fetchLocations: !!fetchLocations });
    if (!gameId) return;
    const signal = { cancelled: false };
    void fetchLocations(signal);
    return () => { signal.cancelled = true; };
  }, [gameId, fetchLocations]);

  useEffect(() => {
    console.log('[PlayerLocations] Effect 2 (realtime) running', { gameId, appState });
    if (!gameId) return;
    if (appState !== 'active') return;

    const topic = `realtime:player-locations:${gameId}`;
    const existing = supabase.getChannels().find((c) => c.topic === topic);
    if (existing) {
      supabase.removeChannel(existing);
    }

    const signal = { cancelled: false };
    const channel = supabase
      .channel(`player-locations:${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_locations', filter: `game_id=eq.${gameId}` },
        () => {
          console.log('[PlayerLocations] Realtime change detected');
          void fetchLocations(signal);
        }
      )
      .subscribe();

    return () => {
      signal.cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameId, appState, fetchLocations]);

  return { locations };
}

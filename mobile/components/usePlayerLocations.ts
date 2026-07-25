import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAppState } from '@/components/useAppState';

export type RemotePlayerLocation = {
  playerId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  updatedAt: string;
  source: 'foreground' | 'background';
};

type PlayerLocationRow = {
  player_id: string;
  game_id: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  accuracy: number | null;
  updated_at: string;
  source: 'foreground' | 'background';
};

export function usePlayerLocations(
  gameId: string | null,
  localPlayerId: string | null
) {
  const [locations, setLocations] = useState<Map<string, RemotePlayerLocation>>(new Map());
  const appState = useAppState();

  const fetchLocations = useCallback(async (signal: { cancelled: boolean }) => {
    if (!gameId) return;

    const { data, error } = await supabase
      .from('player_locations')
      .select('*')
      .eq('game_id', gameId);

    if (signal.cancelled || error || !data) return;

    const map = new Map<string, RemotePlayerLocation>();
    for (const row of data as PlayerLocationRow[]) {
      if (row.player_id === localPlayerId) continue;
      map.set(row.player_id, {
        playerId: row.player_id,
        latitude: row.latitude,
        longitude: row.longitude,
        heading: row.heading,
        updatedAt: row.updated_at,
        source: row.source ?? 'foreground',
      });
    }
    setLocations(map);
  }, [gameId, localPlayerId]);

  useEffect(() => {
    if (!gameId) return;
    const signal = { cancelled: false };
    void fetchLocations(signal);
    return () => { signal.cancelled = true; };
  }, [gameId, fetchLocations]);

  useEffect(() => {
    if (!gameId) return;
    if (appState !== 'active') return;

    const signal = { cancelled: false };
    const topic = `realtime:player-locations:${gameId}`;

    // Remove any stale channel with the same topic (Strict Mode double-mount guard)
    const existing = supabase.getChannels().find((c) => c.topic === topic);
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase
      .channel(`player-locations:${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_locations', filter: `game_id=eq.${gameId}` },
        () => {
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

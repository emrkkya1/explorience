import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAppState } from '@/components/useAppState';
import type { Player } from '@/types/Player';

export function usePlayers(gameId: string | null) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const appState = useAppState();

  const fetchPlayers = useCallback(async (signal: { cancelled: boolean }) => {
    setLoading(true);

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('joined_at', { ascending: true });

    if (!signal.cancelled && !error && data) {
      setPlayers(data as Player[]);
    }

    setLoading(false);
  }, [gameId]);

  // Initial + gameId-change fetch (not gated by appState — runs once on join).
  useEffect(() => {
    if (!gameId) return;
    const signal = { cancelled: false };
    void fetchPlayers(signal);
    return () => { signal.cancelled = true; };
  }, [gameId, fetchPlayers]);

  // Realtime subscription (paused on background per spec §FR-6).
  useEffect(() => {
    if (!gameId) return;
    if (appState !== 'active') return;

    const topic = `realtime:players:${gameId}`;
    const existing = supabase.getChannels().find((c) => c.topic === topic);
    if (existing) {
      supabase.removeChannel(existing);
    }

    const signal = { cancelled: false };
    const channel = supabase
      .channel(`players:${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        () => {
          void fetchPlayers(signal);
        }
      )
      .subscribe();

    return () => {
      signal.cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameId, appState, fetchPlayers]);

  return { players, loading };
}

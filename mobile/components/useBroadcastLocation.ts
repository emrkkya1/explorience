import { useEffect, useRef } from 'react';

import { supabase } from '@/lib/supabase';
import type { PlayerLocation } from '@/types/FogOfWar';

const BROADCAST_INTERVAL_MS = 10000;

export function useBroadcastLocation(
  gameId: string | null,
  playerId: string | null,
  location: PlayerLocation | null
) {
  const locationRef = useRef<PlayerLocation | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!gameId || !playerId) return;

    mountedRef.current = true;

    const broadcast = async (source: 'foreground' | 'background' = 'foreground') => {
      const loc = locationRef.current;
      if (!loc) return;

      const { error } = await supabase
        .from('player_locations')
        .upsert(
          {
            player_id: playerId,
            game_id: gameId,
            latitude: loc.latitude,
            longitude: loc.longitude,
            heading: loc.heading,
            accuracy: loc.accuracy,
            updated_at: new Date().toISOString(),
            source,
          },
          { onConflict: 'player_id' }
        );

      if (error) {
        console.error('[BroadcastLocation] upsert failed:', error.message);
      }
    };

    void broadcast();
    const interval = setInterval(() => { void broadcast(); }, BROADCAST_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [gameId, playerId]);

  useEffect(() => {
    if (!location || !gameId || !playerId) return;
    void (async () => {
      const { error } = await supabase
        .from('player_locations')
        .upsert(
          {
            player_id: playerId,
            game_id: gameId,
            latitude: location.latitude,
            longitude: location.longitude,
            heading: location.heading,
            accuracy: location.accuracy,
            updated_at: new Date().toISOString(),
            source: 'foreground',
          },
          { onConflict: 'player_id' }
        );
      if (error) {
        console.error('[BroadcastLocation] first-fix upsert failed:', error.message);
      }
    })();
  }, [location?.timestamp]);
}

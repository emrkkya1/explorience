import { useEffect, useRef } from 'react';

import { supabase } from '@/lib/supabase';
import type { PlayerLocation } from '@/types/FogOfWar';

const BROADCAST_INTERVAL_MS = 30000;

export function useBroadcastLocation(
  gameId: string | null,
  playerId: string | null,
  location: PlayerLocation | null
) {
  console.log('[BroadcastLocation] Hook called with:', { gameId, playerId, hasLocation: !!location });
  const locationRef = useRef<PlayerLocation | null>(null);

  useEffect(() => {
    console.log('[BroadcastLocation] Location updated:', location);
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    console.log('[BroadcastLocation] Effect running', { gameId, playerId });
    if (!gameId || !playerId) {
      console.log('[BroadcastLocation] Missing gameId or playerId, skipping');
      return;
    }

    const broadcast = () => {
      const loc = locationRef.current;
      if (!loc) {
        console.log('[BroadcastLocation] No location available');
        return;
      }

      console.log('[BroadcastLocation] Broadcasting location update');
      supabase.from('player_locations').upsert({
        player_id: playerId,
        game_id: gameId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        heading: loc.heading,
        accuracy: loc.accuracy,
        updated_at: new Date().toISOString(),
      });
    };

    console.log('[BroadcastLocation] Starting broadcast interval');
    broadcast();
    const interval = setInterval(broadcast, BROADCAST_INTERVAL_MS);

    return () => {
      console.log('[BroadcastLocation] Cleaning up interval');
      clearInterval(interval);
    };
  }, [gameId, playerId]);
}

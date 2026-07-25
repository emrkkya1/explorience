import { withAuthRetry } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Standalone Supabase call that flips a poi_discoveries row to explored.
// Hook consumers use this for the network call; their own optimistic UI
// updates can layer on top. The camera route calls it directly because it
// doesn't have access to the usePoiDiscovery hook instance owned by GameMap.
export async function markExploredAction(
  gameId: string,
  playerId: string,
  poiId: string,
  userPhotoUri: string | null
): Promise<void> {
  const { error } = await withAuthRetry(async () => {
    const res = await supabase.rpc('upsert_poi_discovery', {
      p_game_id: gameId,
      p_player_id: playerId,
      p_poi_id: poiId,
      p_explored: true,
      p_explored_by: playerId,
      p_user_photo_uri: userPhotoUri,
    });
    if (res.error) throw res.error;
    return res;
  });
  if (error) {
    console.error('[poiDiscoveryActions] markExplored error:', error);
    throw error;
  }
}
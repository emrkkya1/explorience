import { withAuthRetry } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { PoiCategory, PoiRarity } from '@/types/Poi';

export type ExploreReward = {
  id: string;
  name: string;
  rarity: PoiRarity;
  category: PoiCategory;
  primary_type: string | null;
  latitude: number;
  longitude: number;
  image_uri: string | null;
} | null;

export async function grantRandomHint(
  gameId: string,
  playerId: string
): Promise<ExploreReward> {
  const { data, error } = await withAuthRetry(async () => {
    const res = await supabase.rpc('grant_random_undiscovered_poi_hint', {
      p_game_id: gameId,
      p_player_id: playerId,
    });
    if (res.error) throw res.error;
    return res;
  });
  if (error) {
    console.error('[exploreReward] grantRandomHint error:', error);
    throw error;
  }
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row as ExploreReward;
}

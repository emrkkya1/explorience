import { useState, useCallback } from 'react';

import { supabase } from '@/lib/supabase';
import { saveSession, setActiveSession } from '@/lib/sessionStore';
import {
  ensureAuth,
  syncPlayerUserId as syncPlayerUserIdLib,
} from '@/lib/auth';
import {
  setBgTrackingContext,
  getBgTrackingEnabled,
  type BgTrackingContext,
} from '@/lib/bgTrackingState';
import { CITIES } from '@/constants/Cities';
import { CELL_SIZE } from '@/lib/bitmap/mapping';
import type { GameSession } from '@/types/GameSession';

function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Build the bg-tracking context the background task needs (bounds/grid) from
// the runtime CITIES table, mirroring the math GameMap does at line 41-46.
// Only persisted when the user has bg tracking enabled — otherwise we skip
// the write to keep AsyncStorage quiet for users who opted out.
async function syncBgCtxIfEnabled(sess: GameSession): Promise<void> {
  if (!(await getBgTrackingEnabled())) return;
  const city = CITIES.find((c) => c.name === sess.cityName) ?? CITIES[0];
  const ctx: BgTrackingContext = {
    gameId: sess.gameId,
    playerId: sess.playerId,
    cityId: sess.cityId,
    cityName: sess.cityName,
    bounds: {
      north: city.north,
      south: city.north - city.gridHeight * CELL_SIZE,
      east: city.west + city.gridWidth * CELL_SIZE,
      west: city.west,
    },
    gridWidth: city.gridWidth,
    gridHeight: city.gridHeight,
  };
  await setBgTrackingContext(ctx);
}

export function useGameSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);

  const createGame = useCallback(async (username: string, city: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('[createGame] Starting createGame', { username, city });
      const userId = await ensureAuth();
      console.log('[createGame] Authenticated userId:', userId);

      const { data: cityData, error: cityError } = await supabase
        .from('cities')
        .select('id, name')
        .eq('name', city.toUpperCase())
        .single();
      if (cityError || !cityData) throw new Error('City not found');
      console.log('[createGame] Found city:', cityData);

      const code = generateGameCode();
      console.log('[createGame] Generated code:', code);

      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .insert({
          code,
          city_id: cityData.id,
          host_user_id: userId,
          status: 'waiting'
        })
        .select('id, code')
        .single();
      if (gameError) {
        console.error('[createGame] Game insert error:', gameError);
        throw new Error(gameError.message);
      }
      console.log('[createGame] Created game:', gameData);

      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert({
          user_id: userId,
          username,
          game_id: gameData.id
        })
        .select('id')
        .single();
      if (playerError) {
        console.error('[createGame] Player insert error:', JSON.stringify(playerError, null, 2));
        throw new Error(playerError.message);
      }
      console.log('[createGame] Created player:', playerData);

      const sess: GameSession = {
        gameId: gameData.id,
        gameCode: gameData.code,
        cityName: cityData.name,
        cityId: cityData.id,
        playerId: playerData.id
      };
      setSession(sess);
      await saveSession(sess, username);
      await setActiveSession(sess.gameId);
      await syncBgCtxIfEnabled(sess);
      return sess;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create game';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [ensureAuth]);

  const joinGame = useCallback(async (username: string, gameCode: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('[joinGame] Starting joinGame', { username, gameCode });
      const userId = await ensureAuth();
      console.log('[joinGame] Authenticated userId:', userId);

      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('id, code, city_id, cities(name)')
        .eq('code', gameCode.toUpperCase())
        .single();
      if (gameError || !gameData) {
        console.error('[joinGame] Game lookup error:', gameError);
        throw new Error('Game not found. Check your code.');
      }
      console.log('[joinGame] Found game:', { id: gameData.id, code: gameData.code, city_id: gameData.city_id });

      const { data: existingPlayer, error: existingPlayerError } = await supabase
        .from('players')
        .select('id, user_id, username')
        .eq('username', username)
        .eq('game_id', gameData.id)
        .maybeSingle();

      console.log('[joinGame] Existing player check:', {
        existingPlayer,
        error: existingPlayerError
      });

      let playerId: string;

      if (existingPlayer) {
        console.log('[joinGame] Found existing player - taking over:', existingPlayer);
        const { data: updatedPlayer, error: updateError } = await supabase
          .from('players')
          .update({ user_id: userId })
          .eq('id', existingPlayer.id)
          .select('id')
          .single();
        if (updateError) {
          console.error('[joinGame] Player update error:', JSON.stringify(updateError, null, 2));
          throw new Error(updateError.message);
        }
        console.log('[joinGame] Updated player user_id:', updatedPlayer);
        playerId = updatedPlayer.id;
      } else {
        console.log('[joinGame] Username available, inserting new player');
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .insert({
            user_id: userId,
            username,
            game_id: gameData.id
          })
          .select('id')
          .single();
        if (playerError) {
          console.error('[joinGame] Player insert error:', JSON.stringify(playerError, null, 2));
          throw new Error(playerError.message);
        }
        console.log('[joinGame] Inserted player:', playerData);
        playerId = playerData.id;
      }

      const cityName = (gameData as any).cities?.name ?? 'Unknown';
      const sess: GameSession = {
        gameId: gameData.id,
        gameCode: gameData.code,
        cityName,
        cityId: gameData.city_id,
        playerId
      };
      await saveSession(sess, username);
      await setActiveSession(sess.gameId);
      await syncBgCtxIfEnabled(sess);
      setSession(sess);
      return sess;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to join game';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [ensureAuth]);

  const syncPlayerUserId = useCallback(
    async (gameId: string, playerId: string): Promise<void> => {
      await syncPlayerUserIdLib(gameId, playerId);
    },
    []
  );

  return { createGame, joinGame, syncPlayerUserId, loading, error, session };
}

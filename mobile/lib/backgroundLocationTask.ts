import { AppState } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

import { FOG_CONFIG } from '@/constants/FogOfWar';
import { exploreCellsAtLocation } from '@/lib/bitmap/fogExploration';
import { detectPoiEvents } from '@/lib/poiDiscovery';
import { createCoalescedFlush } from '@/lib/coalescedFlush';
import { createBitmap } from '@/lib/bitmap/core';
import { loadAndMergeBitmap } from '@/lib/bitmap/compaction';
import { supabase } from '@/lib/supabase';
import { withAuthRetry } from '@/lib/auth';
import {
  getBgTrackingContext,
  type BgTrackingContext,
} from '@/lib/bgTrackingState';
import { readPoiCache } from '@/lib/poiCache';
import { appendBgEventsLedger } from '@/lib/bgEventsLedger';
import type { Poi } from '@/types/Poi';
import type { PlayerLocation } from '@/types/FogOfWar';

export const BG_LOCATION_TASK = 'background-location-task';

// Module-scoped mutable state owned by the task (one instance across app
// lifetime). Initialized lazily inside initIfNeeded() on first callback.
let bitmap: Uint8Array | null = null;
let poiCache: Poi[] = [];
let hintedSet = new Set<string>();
let discoveredSet = new Set<string>();
let deltaBuffer: number[] = [];
let pendingHints: string[] = [];
let pendingDiscoveries: string[] = [];
let bitmapInitialized = false;
let lastNotifiedAt = 0;
let lastPoiIdAt = new Map<string, number>();
let latestPlayerLoc: { latitude: number; longitude: number; heading: number | null; accuracy: number | null } | null = null;

const flush = async (): Promise<boolean> => {
  const ctx = await getBgTrackingContext();
  if (!ctx) return true;
  try {
    let hadError = false;

    if (latestPlayerLoc) {
      const loc = latestPlayerLoc;
      latestPlayerLoc = null;
      const { error } = await supabase
        .from('player_locations')
        .upsert(
          {
            player_id: ctx.playerId,
            game_id: ctx.gameId,
            latitude: loc.latitude,
            longitude: loc.longitude,
            heading: loc.heading,
            accuracy: loc.accuracy,
            updated_at: new Date().toISOString(),
            source: 'background',
          },
          { onConflict: 'player_id' }
        );
      if (error) {
        latestPlayerLoc = loc;
        hadError = true;
        console.error('[BgTask] player_locations upsert error', error);
      }
    }

    if (deltaBuffer.length > 0) {
      const deltas = deltaBuffer;
      deltaBuffer = [];
      const { error } = await supabase.from('fog_deltas').insert({
        game_id: ctx.gameId,
        player_id: ctx.playerId,
        deltas,
      });
      if (error) {
        deltaBuffer = [...deltas, ...deltaBuffer];
        hadError = true;
        console.error('[BgTask] fog_deltas insert error', error);
      }
    }

    if (pendingHints.length > 0) {
      const hints = pendingHints;
      pendingHints = [];
      await Promise.all(
        hints.map((poi_id) =>
          withAuthRetry(async () => {
            const { error } = await supabase.rpc('upsert_poi_hint', {
              p_game_id: ctx.gameId,
              p_player_id: ctx.playerId,
              p_poi_id: poi_id,
            });
            if (error) throw error;
          }).catch((e) => {
            pendingHints.push(poi_id);
            hadError = true;
            console.error('[BgTask] hint sync error', poi_id, e);
          })
        )
      );
    }

    if (pendingDiscoveries.length > 0) {
      const dsc = pendingDiscoveries;
      pendingDiscoveries = [];
      await Promise.all(
        dsc.map((poi_id) =>
          withAuthRetry(async () => {
            const { error } = await supabase.rpc('upsert_poi_discovery', {
              p_game_id: ctx.gameId,
              p_player_id: ctx.playerId,
              p_poi_id: poi_id,
            });
            if (error) throw error;
          }).catch((e) => {
            pendingDiscoveries.push(poi_id);
            hadError = true;
            console.error('[BgTask] discovery sync error', poi_id, e);
          })
        )
      );
    }

    return !hadError;
  } catch (e) {
    console.error('[BgTask] flush error', e);
    return false;
  }
};

const coalescer = createCoalescedFlush(flush, FOG_CONFIG.SYNC_COALESCE_MS);

async function initIfNeeded(ctx: BgTrackingContext): Promise<void> {
  if (bitmapInitialized) return;
  const loaded = await loadAndMergeBitmap(ctx.gameId, ctx.gridWidth, ctx.gridHeight);
  bitmap = loaded ?? createBitmap(ctx.gridWidth, ctx.gridHeight);
  poiCache = await readPoiCache(ctx.cityId);

  // Hydrate already-hinted / already-discovered sets from the DB so we do
  // not re-announce or re-flush POIs the task already wrote before being
  // killed (task-level state is module-scoped, lost on app kill).
  const [hintRes, discRes] = await Promise.all([
    supabase.from('poi_hints').select('poi_id').eq('game_id', ctx.gameId),
    supabase.from('poi_discoveries').select('poi_id').eq('game_id', ctx.gameId),
  ]);
  hintedSet = new Set((hintRes.data ?? []).map((r: { poi_id: string }) => r.poi_id));
  discoveredSet = new Set((discRes.data ?? []).map((r: { poi_id: string }) => r.poi_id));
  bitmapInitialized = true;
  console.log(
    '[BgTask] initialized',
    { poiCount: poiCache.length, hints: hintedSet.size, discovered: discoveredSet.size }
  );
}

async function maybeNotify(ctx: BgTrackingContext, discoveries: Poi[]): Promise<void> {
  if (AppState.currentState === 'active') return; // Foreground already surfaces UI.
  if (discoveries.length === 0) return;
  const now = Date.now();
  for (const poi of discoveries) {
    const last = lastPoiIdAt.get(poi.id) ?? 0;
    if (now - last < 1500) continue; // de-dupe same POI in tight loop
    lastPoiIdAt.set(poi.id, now);
    if (now - lastNotifiedAt < 1500) continue; // throttle across POIs
    lastNotifiedAt = now;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'New discovery!',
          body: `${poi.name} discovered while you were away.`,
          data: { poi_id: poi.id, game_id: ctx.gameId },
          sound: true,
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('[BgTask] notification failed', e);
    }
  }
}

TaskManager.defineTask(BG_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BgTask] task error', error.message);
    return;
  }
  const ctx = await getBgTrackingContext();
  if (!ctx) {
    console.log('[BgTask] no active session — skipping (self-stop handled on next foreground)');
    return;
  }
  try {
    await initIfNeeded(ctx);
    const locations = (data as { locations: Location.LocationObject[] }).locations;
    const loc = locations[locations.length - 1];
    if (!loc) return;
    const playerLoc: PlayerLocation = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      heading: null,
      timestamp: loc.timestamp,
    };

    latestPlayerLoc = {
      latitude: playerLoc.latitude,
      longitude: playerLoc.longitude,
      heading: playerLoc.heading,
      accuracy: playerLoc.accuracy,
    };
    coalescer.schedule();

    // Fog exploration
    const newBits = exploreCellsAtLocation(
      playerLoc,
      ctx.bounds,
      ctx.gridWidth,
      ctx.gridHeight,
      bitmap as Uint8Array
    );
    if (newBits.length > 0) {
      deltaBuffer.push(...newBits);
      coalescer.schedule();
    }

    // POI hint/discovery
    const { newHints, newDiscoveries } = detectPoiEvents(
      playerLoc,
      poiCache,
      hintedSet,
      discoveredSet
    );

    if (newHints.length > 0) {
      for (const p of newHints) {
        hintedSet.add(p.id);
        pendingHints.push(p.id);
      }
      await appendBgEventsLedger({ newHintPoiIds: newHints.map((p) => p.id) });
      coalescer.schedule();
    }

    if (newDiscoveries.length > 0) {
      for (const p of newDiscoveries) {
        discoveredSet.add(p.id);
        pendingDiscoveries.push(p.id);
      }
      await appendBgEventsLedger({
        newDiscoveryPoiIds: newDiscoveries.map((p) => p.id),
      });
      coalescer.schedule();
      await maybeNotify(ctx, newDiscoveries);
    }
  } catch (e) {
    console.error('[BgTask] body error', e);
  }
});
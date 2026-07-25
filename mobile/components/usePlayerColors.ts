import { useMemo } from 'react';

import { PLAYER_COLOR_PRESETS } from '@/components/MapPreferencesContext';
import type { RemotePlayerLocation } from '@/components/usePlayerLocations';

const THRESHOLD_ACTIVE_MS = 45000;
const THRESHOLD_IDLE_MS = 150000;
const INACTIVE_COLOR = '#888888';

export type PlayerActivity = 'active' | 'idle' | 'offline';

export const ACTIVITY_COLORS: Record<PlayerActivity, string> = {
  active: '#34C759',
  idle: '#FF9500',
  offline: '#888888',
};

export const ACTIVITY_LABELS: Record<PlayerActivity, string> = {
  active: 'Active',
  idle: 'Idle',
  offline: 'Offline',
};

function hashPlayerId(playerId: string): number {
  const hex = playerId.replace(/-/g, '').slice(0, 8);
  return parseInt(hex, 16);
}

export function getPlayerActivity(loc: RemotePlayerLocation): PlayerActivity {
  const updated = new Date(loc.updatedAt).getTime();
  const age = Date.now() - updated;

  if (loc.source === 'foreground' && age < THRESHOLD_ACTIVE_MS) return 'active';
  if (loc.source === 'background' && age < THRESHOLD_IDLE_MS) return 'idle';
  return 'offline';
}

export function usePlayerColors(
  remoteLocations: Map<string, RemotePlayerLocation>,
  localPlayerColor: string
): Map<string, string> {
  return useMemo(() => {
    const availableColors = PLAYER_COLOR_PRESETS
      .map((p) => p.color)
      .filter((c) => c !== localPlayerColor);

    if (availableColors.length === 0) {
      availableColors.push(...PLAYER_COLOR_PRESETS.map((p) => p.color));
    }

    const colorMap = new Map<string, string>();

    for (const [playerId, loc] of remoteLocations) {
      const activity = getPlayerActivity(loc);
      if (activity === 'offline') {
        colorMap.set(playerId, INACTIVE_COLOR);
        continue;
      }

      const index = hashPlayerId(playerId) % availableColors.length;
      colorMap.set(playerId, availableColors[index]);
    }

    return colorMap;
  }, [remoteLocations, localPlayerColor]);
}

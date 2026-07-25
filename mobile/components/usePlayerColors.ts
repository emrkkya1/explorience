import { useMemo } from 'react';

import { PLAYER_COLOR_PRESETS } from '@/components/MapPreferencesContext';
import type { RemotePlayerLocation } from '@/components/usePlayerLocations';

const INACTIVE_THRESHOLD_MS = 30000;
const INACTIVE_COLOR = '#888888';

function hashPlayerId(playerId: string): number {
  const hex = playerId.replace(/-/g, '').slice(0, 8);
  return parseInt(hex, 16);
}

export function isPlayerActive(updatedAt: string): boolean {
  const updated = new Date(updatedAt).getTime();
  const now = Date.now();
  return now - updated < INACTIVE_THRESHOLD_MS;
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
      if (!isPlayerActive(loc.updatedAt)) {
        colorMap.set(playerId, INACTIVE_COLOR);
        continue;
      }

      const index = hashPlayerId(playerId) % availableColors.length;
      colorMap.set(playerId, availableColors[index]);
    }

    return colorMap;
  }, [remoteLocations, localPlayerColor]);
}

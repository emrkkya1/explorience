import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import {
  clearExploreCapture,
  useExploreCapture,
} from '@/lib/exploreCaptureStore';
import type { Poi } from '@/types/Poi';

// useExploreFlow is a thin bookkeeper: startExplore pushes the camera route
// and writes an in-progress capture; onChange of the capture store, it
// reconciles local state to either idle (canceled) or success.
//
// All camera + verification UI moved into app/explore-camera.tsx, which
// performs the LLM call and calls markExploredAction directly.

type UseExploreFlowParams = {
  gameId: string | null;
  playerId: string | null;
};

type UseExploreFlowReturn = {
  activePoi: Poi | null;
  startExplore: (poi: Poi) => void;
};

export function useExploreFlow({
  gameId,
  playerId,
}: UseExploreFlowParams): UseExploreFlowReturn {
  const [activePoi, setActivePoi] = useState<Poi | null>(null);
  const capture = useExploreCapture();

  const startExplore = useCallback((poi: Poi) => {
    setActivePoi(poi);
    // The camera route initializes capture to 'in-progress' on mount; we just
    // navigate, passing the values the route needs to perform verification.
    router.push({
      pathname: '/explore-camera',
      params: {
        poiId: poi.id,
        gameId: gameId ?? '',
        playerId: playerId ?? '',
      },
    });
  }, [gameId, playerId]);

  // Reconcile local activePoi when the capture store reaches a terminal
  // status so GameMap can drop its in-flight pointer (the realtime UPDATE
  // channel will independently flip PoiDetailCard to show the Explored badge).
  useEffect(() => {
    if (!activePoi || !capture) return;
    if (capture.poiId !== activePoi.id) return;
    if (capture.status === 'in-progress') return;
    // Terminal: clear the in-flight capture + local slot so a future explore
    // can re-use the same hook instance cleanly.
    clearExploreCapture();
    setActivePoi(null);
  }, [activePoi, capture]);

  return { activePoi, startExplore };
}
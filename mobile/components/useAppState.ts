import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Lightweight hook exposing the current AppState value. Used by realtime
// channel subscription effects (useFogOfWar, usePoiDiscovery, usePlayers) as
// a dependency so the channel is torn down when the app goes to background
// and re-created on return to foreground — honoring the "disable realtime,
// writes only" requirement while the background location task continues to
// push fog_deltas / poi discoveries to Supabase.
export function useAppState(): AppStateStatus {
  const [state, setState] = useState<AppStateStatus>(
    AppState.currentState ?? 'active'
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setState(next);
    });
    return () => sub.remove();
  }, []);

  return state;
}
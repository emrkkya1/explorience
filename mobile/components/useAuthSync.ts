import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { getActiveSession } from '@/lib/sessionStore';
import { syncPlayerUserId } from '@/lib/auth';

export function useAuthSync(): void {
  useEffect(() => {
    let cancelled = false;

    // Re-sync once on mount: covers app cold-start with a replaced anon session
    // (players.user_id stale relative to the current auth.uid()).
    getActiveSession().then((s) => {
      if (!cancelled && s) void syncPlayerUserId(s.gameId, s.playerId);
    });

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_IN' && event !== 'TOKEN_REFRESHED') return;
      getActiveSession().then((s) => {
        if (s) void syncPlayerUserId(s.gameId, s.playerId);
      });
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);
}
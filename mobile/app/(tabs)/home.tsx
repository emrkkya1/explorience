import { useEffect, useState } from 'react';

import { View } from '@/tw';
import { getActiveSession } from '@/lib/sessionStore';
import type { StoredSession } from '@/lib/sessionStore';
import { supabase } from '@/lib/supabase';
import { GameMap } from '@/components/GameMap';
import { useGameSession } from '@/components/useGameSession';

export default function ExploreScreen() {
  const [stored, setStored] = useState<StoredSession | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const { syncPlayerUserId } = useGameSession();

  useEffect(() => {
    getActiveSession().then(async (session) => {
      if (!session) {
        setReady(true);
        return;
      }

      setStored(session);

      if (session.cityId) {
        setCityId(session.cityId);
      } else {
        const { data } = await supabase
          .from('cities')
          .select('id')
          .eq('name', session.cityName)
          .single();
        if (data) setCityId(data.id);
      }

      await syncPlayerUserId(session.gameId, session.playerId);
      setReady(true);
    });
  }, []);

  if (!stored || !cityId || !ready) return null;

  return (
    <View className="flex-1">
      <GameMap
        cityName={stored.cityName}
        cityId={cityId}
        gameId={stored.gameId}
        playerId={stored.playerId}
      />
    </View>
  );
}

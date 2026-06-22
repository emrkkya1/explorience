import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useNavigation } from 'expo-router';

import { View } from '@/tw';
import { getActiveSession } from '@/lib/sessionStore';
import type { StoredSession } from '@/lib/sessionStore';
import { supabase } from '@/lib/supabase';
import { GameMap } from '@/components/GameMap';

export default function HomeScreen() {
  const [stored, setStored] = useState<StoredSession | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    getActiveSession().then(async (session) => {
      setStored(session);
      if (session) {
        navigation.setOptions({
          title: session.cityName,
          headerRight: () => (
            <Text style={{ marginRight: 15, fontSize: 16, fontWeight: '600' }}>
              {session.username}
            </Text>
          ),
        });

        // Resolve cityId — either from stored session or by looking it up
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
      }
    });
  }, [navigation]);

  if (!stored || !cityId) return null;

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

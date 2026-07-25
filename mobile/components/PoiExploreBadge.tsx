import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';
import { Image } from '@/tw/image';
import { ThemedText } from './ThemedText';

type PoiExploreBadgeProps = {
  exploredByUsername?: string;
  discoveredByUsername?: string;
  userPhotoUri?: string | null;
};

export function PoiExploreBadge({
  exploredByUsername,
  discoveredByUsername,
  userPhotoUri,
}: PoiExploreBadgeProps) {
  const colorScheme = useColorScheme();
  const [enlarged, setEnlarged] = useState(false);

  const isSameUser = exploredByUsername && discoveredByUsername && exploredByUsername === discoveredByUsername;
  const attributionText = isSameUser
    ? `Discovered and explored by ${exploredByUsername}`
    : `Explored by ${exploredByUsername ?? 'unknown'}`;

  return (
    <>
      <View className="flex-col gap-2 mb-4">
        <View className="flex-row items-center gap-2 self-start rounded-lg bg-primary/10 dark:bg-primary-dark/20 px-3 py-2">
          <SymbolView
            name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'badge-check' }}
            size={16}
            tintColor={Colors[colorScheme].success}
          />
          <ThemedText variant="bodySmall" className="text-primary dark:text-primary-dark">
            {attributionText}
          </ThemedText>
        </View>
        {!isSameUser && discoveredByUsername ? (
          <View className="flex-row items-center gap-2 self-start rounded-lg bg-blue-500/10 dark:bg-blue-500/20 px-3 py-2">
            <SymbolView
              name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'map-pin' }}
              size={16}
              tintColor={Colors[colorScheme].tint}
            />
            <ThemedText variant="bodySmall" className="text-blue-600 dark:text-blue-400">
              Discovered by {discoveredByUsername}
            </ThemedText>
          </View>
        ) : null}
        {userPhotoUri ? (
          <Pressable
            className="w-20 h-20 rounded-lg overflow-hidden border border-border dark:border-border-dark active:opacity-80"
            onPress={() => setEnlarged(true)}
          >
            <Image source={userPhotoUri} contentFit="cover" className="w-full h-full" />
          </Pressable>
        ) : null}
      </View>

      {enlarged && userPhotoUri ? (
        <Pressable
          className="absolute inset-0 z-[60] bg-black/80 items-center justify-center"
          onPress={() => setEnlarged(false)}
        >
          <View className="w-[80%] h-[80%] rounded-2xl overflow-hidden">
            <Image source={userPhotoUri} contentFit="contain" className="w-full h-full" />
          </View>
        </Pressable>
      ) : null}
    </>
  );
}

PoiExploreBadge.displayName = 'PoiExploreBadge';
import { SymbolView } from 'expo-symbols';
import { Dimensions } from 'react-native';
import { useEffect, useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View, Pressable } from '@/tw';
import { Image } from '@/tw/image';
import { supabase } from '@/lib/supabase';
import { ThemedText } from './ThemedText';
import Colors, { semanticColors } from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { PoiCategoryIcon } from './PoiCategoryIcon';
import { PoiExploreBadge } from './PoiExploreBadge';
import type { Poi } from '@/types/Poi';
import type { PoiDiscoveryState } from '@/types/PoiDiscovery';
import { RARITY_COLORS } from '@/constants/Rarity';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Card has 16px margins each side and 16px padding each side inside.
const CARD_CONTENT_WIDTH = SCREEN_WIDTH - 16 * 2 - 16 * 2;
const MAX_IMAGE_HEIGHT = SCREEN_HEIGHT * 0.55;

type PoiDetailCardProps = {
  visible: boolean;
  poi: Poi | null;
  exploredState?: PoiDiscoveryState | null;
  onExplore?: (poi: Poi) => void;
  onClose: () => void;
};

export function PoiDetailCard({ visible, poi, exploredState, onExplore, onClose }: PoiDetailCardProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const [exploredByUsername, setExploredByUsername] = useState<string | undefined>(undefined);
  const [discoveredByUsername, setDiscoveredByUsername] = useState<string | undefined>(undefined);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : SCREEN_HEIGHT, { duration: 350 });
    backdropOpacity.value = withTiming(visible ? 1 : 0, { duration: 350 });
  }, [visible]);

  const exploredBy = exploredState?.explored_by ?? null;
  const discoveredBy = exploredState?.discovered_by ?? null;

  useEffect(() => {
    if (!exploredBy) {
      setExploredByUsername(undefined);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('players')
        .select('username')
        .eq('id', exploredBy)
        .single();
      if (!cancelled && data) {
        setExploredByUsername(data.username);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exploredBy]);

  useEffect(() => {
    if (!discoveredBy) {
      setDiscoveredByUsername(undefined);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('players')
        .select('username')
        .eq('id', discoveredBy)
        .single();
      if (!cancelled && data) {
        setDiscoveredByUsername(data.username);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [discoveredBy]);

  // Reset aspect-ratio state when the POI changes so we don't reuse the previous
  // image's height for the new one before its onLoad fires.
  useEffect(() => {
    setImageAspectRatio(null);
  }, [poi?.id]);

  const computedImageHeight =
    imageAspectRatio != null
      ? Math.min(
          MAX_IMAGE_HEIGHT,
          CARD_CONTENT_WIDTH / Math.max(imageAspectRatio, 0.01)
        )
      : null;

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: visible ? 'auto' : 'none',
  }));

  if (!poi) return null;

  return (
    <View className="absolute inset-0 z-50" pointerEvents="box-none">
      <Animated.View
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: semanticColors.overlay[colorScheme] },
          backdropStyle,
        ]}
      >
        <Pressable className="flex-1" onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          { position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 80 },
          cardStyle,
        ]}
      >
        <View
          className="overflow-hidden bg-surface dark:bg-surface-dark border border-border dark:border-border-dark"
          style={{ borderRadius: 20 }}
        >
          {/* Drag handle */}
          <View className="items-center pt-2 pb-1">
            <View className="w-8 h-1 rounded-full" style={{ backgroundColor: colors.textTertiary }} />
          </View>

          <View className="px-4 pt-1 pb-4">
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1 pr-3">
                <ThemedText variant="h3" numberOfLines={2}>{poi.name}</ThemedText>
              </View>
              <Pressable
                className="w-8 h-8 rounded-full items-center justify-center active:opacity-60"
                onPress={onClose}
                style={{ backgroundColor: colors.border + '80' }}
              >
                <SymbolView
                  name={{ ios: 'xmark', android: 'close', web: 'x' }}
                  size={14}
                  tintColor={colors.textTertiary}
                />
              </Pressable>
            </View>

            {poi.image_uri ? (
              <Image
                source={poi.image_uri}
                contentFit="contain"
                onLoad={(e) => {
                  const { width, height } = e.source;
                  if (width > 0 && height > 0) {
                    setImageAspectRatio(width / height);
                  }
                }}
                className="rounded-xl mb-4"
                style={
                  computedImageHeight != null
                    ? { width: CARD_CONTENT_WIDTH, height: computedImageHeight }
                    : { width: CARD_CONTENT_WIDTH, height: 160 }
                }
              />
            ) : (
              <View className="h-40 bg-border dark:bg-border-dark rounded-xl items-center justify-center mb-4">
                <PoiCategoryIcon
                  category={poi.category}
                  size={48}
                  color={RARITY_COLORS[poi.rarity]}
                />
              </View>
            )}

            {poi.description ? (
              <ThemedText variant="body" className="mb-3">
                {poi.description}
              </ThemedText>
            ) : null}

            {/* Explored banner */}
            {onExplore && exploredState?.explored === true ? (
              <View className="mb-3">
                <PoiExploreBadge
                  exploredByUsername={exploredByUsername}
                  discoveredByUsername={discoveredByUsername}
                  userPhotoUri={exploredState?.user_photo_uri}
                />
              </View>
            ) : null}

            {/* Discovery attribution (when discovered but not explored) */}
            {exploredState && !exploredState.explored && discoveredByUsername ? (
              <View className="mb-3">
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
              </View>
            ) : null}

            <View className="flex-row items-center justify-between mb-3">
              <Badge label={poi.category} variant={poi.rarity} />
              {poi.rating != null ? (
                <View className="flex-row items-center gap-1">
                  <SymbolView
                    name={{ ios: 'star.fill', android: 'star', web: 'star' }}
                    size={14}
                    tintColor={RARITY_COLORS[poi.rarity]}
                  />
                  <ThemedText variant="mono">{poi.rating.toFixed(1)}</ThemedText>
                </View>
              ) : null}
            </View>

            {onExplore && poi.image_uri && exploredState?.explored !== true ? (
              <Button
                title="Explore this location"
                onPress={() => onExplore(poi)}
                className="w-full"
              />
            ) : null}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

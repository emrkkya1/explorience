import { Dimensions, Pressable as RNPressable, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useColorScheme } from './useColorScheme';
import { ThemedText } from './ThemedText';
import { IconButton } from './IconButton';
import { PoiCategoryIcon } from './PoiCategoryIcon';

import { View, Pressable, ScrollView } from '@/tw';
import { Image } from '@/tw/image';
import Colors, { semanticColors } from '@/constants/Colors';
import type { Poi } from '@/types/Poi';
import { RARITY_COLORS } from '@/constants/Rarity';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.8;
const STORAGE_KEY = 'explorience_places_list_mode';

type ViewMode = 'discovered' | 'explored';

type PlacesSidebarProps = {
  visible: boolean;
  discoveredPois: Poi[];
  exploredPois: Poi[];
  viewedIds: Set<string>;
  onClose: () => void;
  onSelectPoi: (poiId: string) => void;
};

export function ExploredSidebar({
  visible,
  discoveredPois,
  exploredPois,
  viewedIds,
  onClose,
  onSelectPoi,
}: PlacesSidebarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const [viewMode, setViewMode] = useState<ViewMode>('discovered');

  // Persist last-selected mode.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (cancelled) return;
      if (v === 'discovered' || v === 'explored') setViewMode(v);
    });
    return () => { cancelled = true; };
  }, []);

  const switchMode = (m: ViewMode) => {
    setViewMode(m);
    AsyncStorage.setItem(STORAGE_KEY, m);
  };

  const translateX = useSharedValue(SIDEBAR_WIDTH);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(visible ? 0 : SIDEBAR_WIDTH, { duration: 300 });
    backdropOpacity.value = withTiming(visible ? 1 : 0, { duration: 300 });
  }, [visible]);

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: visible ? 'auto' as const : 'none' as const,
  }));

  const pois = viewMode === 'discovered' ? discoveredPois : exploredPois;

  const sortedPois = useMemo(() => {
    const unviewed = pois.filter((p) => !viewedIds.has(p.id));
    const viewed = pois.filter((p) => viewedIds.has(p.id));
    return [...unviewed, ...viewed];
  }, [pois, viewedIds]);

  const segControlBg = semanticColors.glassSurface[colorScheme];

  return (
    <View className="absolute inset-0 z-50" pointerEvents="box-none">
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: semanticColors.overlay[colorScheme],
          },
          backdropStyle,
        ]}
      >
        <Pressable className="flex-1" onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: SIDEBAR_WIDTH,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            backgroundColor: colors.surface,
            borderLeftWidth: 1,
            borderLeftColor: colors.border,
          },
          sidebarStyle,
        ]}
      >
        <View className="flex-row items-center justify-between px-4 mb-4">
          <ThemedText variant="h3">PLACES</ThemedText>
          <IconButton onPress={onClose} size={36}>
            <SymbolView
              name={{
                ios: 'xmark',
                android: 'close',
                web: 'x',
              }}
              size={18}
              tintColor={colors.text}
            />
          </IconButton>
        </View>

        {/* Segmented control with count badges */}
        <View
          className="flex-row mx-4 mb-4 p-0.5 rounded-lg"
          style={{ backgroundColor: colors.border + '80' }}
        >
          {(['discovered', 'explored'] as ViewMode[]).map((mode) => {
            const active = viewMode === mode;
            const count = mode === 'discovered' ? discoveredPois.length : exploredPois.length;
            return (
              <RNPressable
                key={mode}
                onPress={() => switchMode(mode)}
                style={[
                  styles.segPill,
                  { backgroundColor: active ? colors.surface : 'transparent' },
                  active && { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
                ]}
              >
                <ThemedText
                  variant="mono"
                  className="text-[11px]"
                  style={{ color: active ? colors.text : colors.textTertiary }}
                >
                  {mode === 'discovered' ? 'DISCOVERED' : 'EXPLORED'}
                </ThemedText>
                <View
                  className="ml-1.5 rounded-full px-1.5 py-0.5"
                  style={{ backgroundColor: active ? colors.primary + '15' : colors.border + '80' }}
                >
                  <ThemedText
                    variant="mono"
                    className="text-[10px]"
                    style={{ color: active ? colors.primary : colors.textTertiary }}
                  >
                    {count}
                  </ThemedText>
                </View>
              </RNPressable>
            );
          })}
        </View>

        <ScrollView className="flex-1 px-4">
          {sortedPois.length === 0 ? (
            <View className="items-center pt-12 px-4">
              <SymbolView
                name={{
                  ios: 'binoculars.fill',
                  android: 'explore',
                  web: 'search',
                }}
                size={36}
                tintColor={colors.textTertiary}
              />
              <ThemedText
                variant="body"
                className="text-center mt-4 text-text-secondary dark:text-text-secondary-dark"
              >
                {viewMode === 'discovered'
                  ? 'No places discovered yet.\nStart exploring the map!'
                  : 'No places explored yet.\nUse the camera to verify discoveries!'
                }
              </ThemedText>
            </View>
          ) : (
            sortedPois.map((poi) => (
              <Pressable
                key={poi.id}
                className="flex-row items-center gap-3 py-3 border-b border-border dark:border-border-dark active:opacity-60"
                onPress={() => {
                  onSelectPoi(poi.id);
                  onClose();
                }}
              >
                {poi.image_uri ? (
                  <Image
                    source={poi.image_uri}
                    contentFit="cover"
                    className="w-11 h-11 rounded-xl"
                  />
                ) : (
                  <View
                    className="w-11 h-11 rounded-xl items-center justify-center"
                    style={{ backgroundColor: RARITY_COLORS[poi.rarity] + '20' }}
                  >
                    <PoiCategoryIcon category={poi.category} size={20} color={RARITY_COLORS[poi.rarity]} />
                  </View>
                )}
                <View className="flex-1 pr-1">
                  <View className="flex-row items-center gap-1.5">
                    <ThemedText variant="body" numberOfLines={1} className="flex-1">
                      {poi.name}
                    </ThemedText>
                    {!viewedIds.has(poi.id) && (
                      <View className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
                    )}
                  </View>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <ThemedText variant="caption" className="opacity-70 normal-case">
                      {poi.category}
                    </ThemedText>
                    <View className="w-1 h-1 rounded-full" style={{ backgroundColor: RARITY_COLORS[poi.rarity] }} />
                    <ThemedText variant="caption" className="normal-case" style={{ color: RARITY_COLORS[poi.rarity] }}>
                      {poi.rarity}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  segPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 7,
  },
});

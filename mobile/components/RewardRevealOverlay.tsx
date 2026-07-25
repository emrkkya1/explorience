import { useEffect, useMemo } from 'react';
import { Dimensions, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View } from '@/tw';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { PoiCategoryIcon } from '@/components/PoiCategoryIcon';
import { useColorScheme } from '@/components/useColorScheme';
import { RARITY_COLORS, RARITY_LABELS } from '@/constants/Rarity';
import { semanticColors } from '@/constants/Colors';
import type { PoiRarity } from '@/types/Poi';
import type { ExploreReward } from '@/lib/exploreReward';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CELL_SIZE = 80;
const CELL_GAP = 16;
const CELL_TOTAL = CELL_SIZE + CELL_GAP;

const RARITY_ORDER: PoiRarity[] = ['common', 'rare', 'epic', 'legendary'];
const REEL_REPEATITIONS = 6;

type RewardRevealOverlayProps = {
  visible: boolean;
  reward: ExploreReward;
  onClose: () => void;
};

function buildReelItems(): { rarity: PoiRarity; key: string }[] {
  const items: { rarity: PoiRarity; key: string }[] = [];
  for (let rep = 0; rep < REEL_REPEATITIONS; rep++) {
    for (const rarity of RARITY_ORDER) {
      items.push({ rarity, key: `${rep}-${rarity}` });
    }
  }
  return items;
}

export function RewardRevealOverlay({ visible, reward, onClose }: RewardRevealOverlayProps) {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const reelX = useSharedValue(SCREEN_WIDTH);
  const textOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const circleScale = useSharedValue(1);

  const reelItems = useMemo(() => buildReelItems(), []);

  const winningIndex = useMemo(() => {
    if (!reward) return -1;
    const lastRep = REEL_REPEATITIONS - 1;
    const rarityIdx = RARITY_ORDER.indexOf(reward.rarity);
    return lastRep * RARITY_ORDER.length + rarityIdx;
  }, [reward]);

  const finalX = useMemo(() => {
    if (winningIndex < 0) return 0;
    const centerOffset = SCREEN_WIDTH / 2 - CELL_SIZE / 2;
    return -(winningIndex * CELL_TOTAL) + centerOffset;
  }, [winningIndex]);

  useEffect(() => {
    if (!visible || !reward) return;
    reelX.value = SCREEN_WIDTH;
    textOpacity.value = 0;
    buttonOpacity.value = 0;
    circleScale.value = 1;

    reelX.value = withSequence(
      withTiming(finalX, {
        duration: 2800,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(finalX, { duration: 100 })
    );

    const textTimer = setTimeout(() => {
      textOpacity.value = withTiming(1, { duration: 400 });
      circleScale.value = withSequence(
        withTiming(1.2, { duration: 200, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 300 })
      );
    }, 2900);

    const buttonTimer = setTimeout(() => {
      buttonOpacity.value = withTiming(1, { duration: 300 });
    }, 3200);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(buttonTimer);
    };
  }, [visible, reward, finalX, reelX, textOpacity, buttonOpacity, circleScale]);

  const reelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: reelX.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const winnerCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  if (!visible || !reward) return null;

  const rarityColor = RARITY_COLORS[reward.rarity];
  const overlayColor = semanticColors.overlay[colorScheme];

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]}
        pointerEvents="auto"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View
        style={[
          StyleSheet.absoluteFill,
          { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top + 32 },
        ]}
        pointerEvents="box-none"
      >
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <ThemedText variant="caption" style={{ color: '#A3A3A3', marginBottom: 8 }}>
            NEW PLACE UNLOCKED
          </ThemedText>
          <Animated.View style={winnerCircleStyle}>
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: rarityColor,
                borderWidth: 4,
                borderColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: rarityColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <PoiCategoryIcon category={reward.category} size={40} color="#FFFFFF" />
            </View>
          </Animated.View>
        </View>

        <View style={{ height: CELL_SIZE + 20, overflow: 'hidden', width: SCREEN_WIDTH }}>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: CELL_SIZE + 12,
                height: CELL_SIZE + 12,
                borderRadius: (CELL_SIZE + 12) / 2,
                borderWidth: 3,
                borderColor: '#FFFFFF',
                borderStyle: 'dashed',
              }}
            />
          </View>

          <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: CELL_GAP }, reelStyle]}>
            {reelItems.map((item) => (
              <View
                key={item.key}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  borderRadius: CELL_SIZE / 2,
                  backgroundColor: RARITY_COLORS[item.rarity],
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.6,
                }}
              >
                <ThemedText
                  variant="caption"
                  style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 10 }}
                >
                  {RARITY_LABELS[item.rarity]}
                </ThemedText>
              </View>
            ))}
          </Animated.View>
        </View>

        <Animated.View style={[{ marginTop: 32, alignItems: 'center' }, textStyle]}>
          <ThemedText variant="h2" style={{ color: rarityColor, marginBottom: 4 }}>
            New {RARITY_LABELS[reward.rarity]} place
          </ThemedText>
          <ThemedText variant="h3" style={{ color: '#FFFFFF' }}>
            unlocked!
          </ThemedText>
        </Animated.View>

        <Animated.View style={[{ marginTop: 40 }, buttonStyle]}>
          <Button title="Let's find it" variant="primary" onPress={onClose} />
        </Animated.View>
      </View>
    </View>
  );
}

RewardRevealOverlay.displayName = 'RewardRevealOverlay';

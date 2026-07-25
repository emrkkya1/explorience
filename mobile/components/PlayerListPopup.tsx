import { SymbolView } from 'expo-symbols';
import { Dimensions } from 'react-native';
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View, Pressable, ScrollView } from '@/tw';
import Colors, { semanticColors } from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';
import { ThemedText } from './ThemedText';
import { Card } from './Card';
import { IconButton } from './IconButton';
import { isPlayerActive } from './usePlayerColors';
import type { Player } from '@/types/Player';
import type { RemotePlayerLocation } from './usePlayerLocations';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type PlayerListPopupProps = {
  visible: boolean;
  players: Player[];
  remotePlayerLocations: Map<string, RemotePlayerLocation>;
  localPlayerId: string;
  onClose: () => void;
  onSelectPlayer: (player: Player) => void;
};

export function PlayerListPopup({ visible, players, remotePlayerLocations, localPlayerId, onClose, onSelectPlayer }: PlayerListPopupProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const iconColor = Colors[colorScheme].text;

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : SCREEN_HEIGHT, { duration: 350 });
    backdropOpacity.value = withTiming(visible ? 1 : 0, { duration: 350 });
  }, [visible]);

  const popupStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: visible ? 'auto' : 'none',
  }));

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
          popupStyle,
        ]}
      >
        <Card className="max-h-96">
          <View className="flex-row items-center justify-between mb-4">
            <ThemedText variant="h3">Players</ThemedText>
            <IconButton onPress={onClose} size={36}>
              <SymbolView
                name={{
                  ios: 'xmark',
                  android: 'close',
                  web: 'x',
                }}
                size={18}
                tintColor={iconColor}
              />
            </IconButton>
          </View>

          <ScrollView className="max-h-72">
            {players.length === 0 && (
              <ThemedText variant="bodySmall" className="text-text-secondary dark:text-text-secondary-dark">
                No other players in this game yet.
              </ThemedText>
            )}
            {players.map((player) => {
              const isLocalPlayer = player.id === localPlayerId;
              const loc = remotePlayerLocations.get(player.id);
              const active = isLocalPlayer || (loc ? isPlayerActive(loc.updatedAt) : false);
              const colors = Colors[colorScheme];
              return (
                <Pressable
                  key={player.id}
                  className="flex-row items-center gap-3 py-3 border-b border-border dark:border-border-dark active:opacity-60"
                  onPress={() => onSelectPlayer(player)}
                >
                  <View className="w-10 h-10 rounded bg-primary dark:bg-primary-dark items-center justify-center">
                    <SymbolView
                      name={{
                        ios: 'person.fill',
                        android: 'person',
                        web: 'user',
                      }}
                      size={20}
                      tintColor="#FFFFFF"
                    />
                  </View>
                  <ThemedText variant="body" className="flex-1">{player.username}</ThemedText>
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? colors.success : colors.textTertiary }} />
                    <ThemedText variant="caption" style={{ color: active ? colors.success : colors.textTertiary }}>
                      {active ? 'Active' : 'Not Active'}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Card>
      </Animated.View>
    </View>
  );
}

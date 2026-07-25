import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View, Pressable, ScrollView } from '@/tw';
import { ThemedText } from '@/components/ThemedText';
import { FogColorSettings } from '@/components/FogColorSettings';
import { useMapPreferences, PLAYER_COLOR_PRESETS } from '@/components/MapPreferencesContext';

export default function VisualsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { fogColorId, setFogColorId, playerColor, setPlayerColor } = useMapPreferences();

  return (
    <ScrollView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="px-4 pb-8" style={{ paddingTop: 16, paddingBottom: insets.bottom + 32 }}>
        <View className="gap-4">
          <FogColorSettings selectedColorId={fogColorId} onSelect={setFogColorId} />

          <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
            <ThemedText variant="h3" className="mb-3">Player Marker</ThemedText>
            <View className="flex-row gap-2">
              {PLAYER_COLOR_PRESETS.map((preset) => (
                <Pressable
                  key={preset.id}
                  onPress={() => setPlayerColor(preset.color)}
                  className="flex-1 items-center gap-2"
                >
                  <View
                    className="w-12 h-12 rounded-full border-2"
                    style={{
                      backgroundColor: preset.color,
                      borderColor: playerColor === preset.color ? colors.accent : colors.border,
                    }}
                  />
                  <ThemedText variant="caption" className="text-center" numberOfLines={1}>{preset.name}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

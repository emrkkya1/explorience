import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';
import { View, Pressable } from '@/tw';
import { ThemedText } from './ThemedText';
import { FOG_COLOR_PRESETS, type FogColorPreset } from '@/constants/FogColors';

type FogColorSettingsProps = {
  selectedColorId: string;
  onSelect: (colorId: string) => void;
};

export function FogColorSettings({ selectedColorId, onSelect }: FogColorSettingsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
      <ThemedText variant="h3" className="mb-3">Fog Color</ThemedText>
      <View className="flex-row gap-2">
        {FOG_COLOR_PRESETS.map((preset: FogColorPreset) => (
          <Pressable
            key={preset.id}
            onPress={() => onSelect(preset.id)}
            className="flex-1 items-center gap-2"
          >
            <View
              className="w-12 h-12 rounded-full border-2"
              style={{
                backgroundColor: preset.color,
                borderColor: selectedColorId === preset.id ? colors.accent : colors.border,
              }}
            />
            <ThemedText variant="caption" className="text-center" numberOfLines={1}>{preset.name}</ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

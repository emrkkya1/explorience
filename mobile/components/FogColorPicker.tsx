import { View, Text, Pressable } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';
import { FOG_COLOR_PRESETS, type FogColorPreset } from '@/constants/FogColors';

type FogColorPickerProps = {
  selectedColorId: string;
  onSelect: (colorId: string) => void;
};

export function FogColorPicker({ selectedColorId, onSelect }: FogColorPickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 100,
        right: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 8, color: colors.text }}>
        Fog Color
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FOG_COLOR_PRESETS.map((preset: FogColorPreset) => (
          <Pressable
            key={preset.id}
            onPress={() => onSelect(preset.id)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: preset.color,
              borderWidth: selectedColorId === preset.id ? 3 : 2,
              borderColor: selectedColorId === preset.id ? colors.accent : colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 2,
            }}
          />
        ))}
      </View>
    </View>
  );
}

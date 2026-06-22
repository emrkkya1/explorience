import { View, Text, Pressable } from 'react-native';
import { FOG_COLOR_PRESETS, type FogColorPreset } from '@/constants/FogColors';

type FogColorPickerProps = {
  selectedColorId: string;
  onSelect: (colorId: string) => void;
};

export function FogColorPicker({ selectedColorId, onSelect }: FogColorPickerProps) {
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 100,
        right: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 8, color: '#1A1A1A' }}>
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
              borderColor: selectedColorId === preset.id ? '#FFFFFF' : '#E2E0DC',
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

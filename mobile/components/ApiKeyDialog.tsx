import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import Colors, { semanticColors } from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';
import { View, TextInput } from '@/tw';
import { Animated } from '@/tw/animated';
import { ThemedText } from './ThemedText';
import { Button } from './Button';

type ApiKeyDialogProps = {
  visible: boolean;
  initialValue: string;
  onSubmit: (key: string) => void;
  onCancel: () => void;
};

export function ApiKeyDialog({
  visible,
  initialValue,
  onSubmit,
  onCancel,
}: ApiKeyDialogProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const opacity = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [visible, opacity]);

  const colorScheme = useColorScheme();

  if (!visible) return null;

  const handleSubmit = () => {
    onSubmit(value.trim());
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <View className="absolute inset-0 z-[70] items-center justify-center" pointerEvents="box-none">
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: semanticColors.overlay[colorScheme],
          opacity: opacity,
          pointerEvents: visible ? 'auto' : 'none',
        }}
      >
        <Pressable className="flex-1" onPress={handleCancel} />
      </Animated.View>

      <Animated.View
        style={{ opacity: opacity }}
        className="w-[85%] max-w-sm"
      >
        <View className="rounded-2xl bg-bg dark:bg-bg-dark border border-border dark:border-border-dark p-5">
          <ThemedText variant="h3" className="text-center mb-4">
            Paste your API key here
          </ThemedText>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="API key"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            className="rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark px-3 py-3 text-text-primary dark:text-text-primary-dark mb-4"
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button title="Cancel" variant="ghost" onPress={handleCancel} />
            </View>
            <View className="flex-1">
              <Button title="Save" variant="primary" onPress={handleSubmit} />
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

ApiKeyDialog.displayName = 'ApiKeyDialog';
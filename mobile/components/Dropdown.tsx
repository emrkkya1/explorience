import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';
import { View, Pressable as TwPressable } from '@/tw';
import { ThemedText } from './ThemedText';

export type DropdownOption<T> = {
  value: T;
  label: string;
};

type DropdownProps<T> = {
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
};

const OPEN_DURATION = 150;
const PANEL_MAX_HEIGHT = 240;

export function Dropdown<T>(props: DropdownProps<T>) {
  const { options, value, onChange, placeholder = 'Select…' } = props;
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const [triggerLayout, setTriggerLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const measuredRef = useRef(false);
  const pendingOpenRef = useRef(false);

  const panelOpacity = useSharedValue(0);
  const panelTranslateY = useSharedValue(4);
  const chevronRotation = useSharedValue(0);

  useEffect(() => {
    panelOpacity.value = withTiming(open ? 1 : 0, { duration: OPEN_DURATION });
    panelTranslateY.value = withTiming(open ? 0 : 4, { duration: OPEN_DURATION });
    chevronRotation.value = withTiming(open ? 180 : 0, { duration: OPEN_DURATION });
  }, [open, panelOpacity, panelTranslateY, chevronRotation]);

  const handleTriggerLayout: NonNullable<ViewProps['onLayout']> = useCallback((e) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setTriggerLayout({ x, y, width, height });
    if (pendingOpenRef.current) {
      pendingOpenRef.current = false;
      measuredRef.current = true;
      setOpen(true);
    }
  }, []);

  const handleTriggerPress = () => {
    if (triggerLayout) {
      setOpen((prev) => !prev);
    } else {
      // will open on next layout pass
      pendingOpenRef.current = true;
    }
  };

  const handleSelect = (v: T) => {
    onChange(v);
    setOpen(false);
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ translateY: panelTranslateY.value }],
  }));

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <>
      <TwPressable
        className="flex-row items-center justify-between bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 active:opacity-70"
        onPress={handleTriggerPress}
        onLayout={handleTriggerLayout}
      >
        <ThemedText
          variant="body"
          className={selectedLabel ? '' : 'text-text-secondary dark:text-text-secondary-dark'}
        >
          {selectedLabel ?? placeholder}
        </ThemedText>
        <Animated.View style={chevronStyle}>
          <SymbolView
            name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'expand_more' }}
            size={18}
            tintColor={Colors[colorScheme].tabIconDefault}
          />
        </Animated.View>
      </TwPressable>

      {open && triggerLayout ? (
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents="box-none"
        >
          <Pressable
            style={[StyleSheet.absoluteFill, { zIndex: 40 }]}
            onPress={() => setOpen(false)}
          />
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: triggerLayout.x,
                top: triggerLayout.y + triggerLayout.height + 4,
                width: triggerLayout.width,
                zIndex: 50,
                maxHeight: PANEL_MAX_HEIGHT,
              },
              panelStyle,
            ]}
            pointerEvents="auto"
          >
            <View className="rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark overflow-hidden">
              <ScrollView bounces={false}>
                {options.map((opt) => {
                  const selected = opt.value === value;
                  return (
                    <TwPressable
                      key={String(opt.value)}
                      className={`flex-row items-center justify-between px-4 py-3 active:opacity-70 ${
                        selected
                          ? 'bg-primary/10 dark:bg-primary-dark/20'
                          : ''
                      }`}
                      onPress={() => handleSelect(opt.value)}
                    >
                      <ThemedText
                        variant="body"
                        color={selected ? 'primary' : undefined}
                      >
                        {opt.label}
                      </ThemedText>
                      {selected ? (
                        <SymbolView
                          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                          size={16}
                          tintColor={Colors[colorScheme].success}
                        />
                      ) : null}
                    </TwPressable>
                  );
                })}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      ) : null}
    </>
  );
}

Dropdown.displayName = 'Dropdown';
import { useRef } from 'react';
import type { ComponentProps } from 'react';
import { Animated } from 'react-native';

import { Pressable } from '@/tw';

type PressableScaleProps = ComponentProps<typeof Pressable> & {
  activeScale?: number;
};

export function PressableScale(props: PressableScaleProps) {
  const { activeScale = 0.97, onPressIn, onPressOut, className = '', style, ...otherProps } = props;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: Parameters<NonNullable<typeof onPressIn>>[0]) => {
    Animated.spring(scale, { toValue: activeScale, useNativeDriver: true, speed: 100 }).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: Parameters<NonNullable<typeof onPressOut>>[0]) => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 100 }).start();
    onPressOut?.(e);
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }]} pointerEvents="box-none">
      <Pressable
        className={className}
        style={style}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...otherProps}
      />
    </Animated.View>
  );
}
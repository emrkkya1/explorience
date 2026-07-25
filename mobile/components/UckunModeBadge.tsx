import { StyleSheet } from 'react-native';

import { View, Text } from '@/tw';

export type UckunModeBadgeSize = 'small' | 'medium' | 'large';

type UckunModeBadgeProps = {
  size?: UckunModeBadgeSize;
};

const sizeMap: Record<UckunModeBadgeSize, { height: number; fontSize: number; paddingHorizontal: number }> = {
  small: { height: 18, fontSize: 9, paddingHorizontal: 5 },
  medium: { height: 24, fontSize: 11, paddingHorizontal: 7 },
  large: { height: 30, fontSize: 13, paddingHorizontal: 9 },
};

export function UckunModeBadge(props: UckunModeBadgeProps) {
  const { size = 'medium' } = props;
  const dims = sizeMap[size];

  return (
    <View
      style={[styles.badge, { height: dims.height, paddingHorizontal: dims.paddingHorizontal }]}
      className="bg-amber-400 dark:bg-amber-400"
    >
      <Text
        style={{ fontSize: dims.fontSize }}
        className="font-jakarta font-extrabold uppercase tracking-tight text-black"
        allowFontScaling={false}
      >
        Uçkun Mode
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#1a1a1a',
    transform: [{ rotate: '-6deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 3,
  },
});
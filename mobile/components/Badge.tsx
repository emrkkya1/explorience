import type { ComponentProps } from 'react';

import { View } from '@/tw';
import { ThemedText } from './ThemedText';
import type { PoiRarity } from '@/types/Poi';

type BadgeVariant = 'default' | PoiRarity;

type BadgeProps = ComponentProps<typeof View> & {
  label: string;
  variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-accent dark:bg-accent-dark',
  legendary: 'bg-rarity-legendary',
  epic: 'bg-rarity-epic',
  rare: 'bg-rarity-rare',
  common: 'bg-rarity-common',
};

const textStyles: Record<BadgeVariant, string> = {
  default: 'text-text-primary dark:text-text-primary-dark',
  legendary: 'text-text-primary',
  epic: 'text-white',
  rare: 'text-white',
  common: 'text-white',
};

export function Badge(props: BadgeProps) {
  const { label, variant = 'default', className = '', ...otherProps } = props;

  return (
    <View
      className={`rounded-md px-2 py-1 self-start ${variantStyles[variant]} ${className}`}
      {...otherProps}
    >
      <ThemedText variant="caption" className={textStyles[variant]}>
        {label}
      </ThemedText>
    </View>
  );
}

import type { ComponentProps } from 'react';

import { Text } from '@/tw';

type ThemedTextProps = ComponentProps<typeof Text> & {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption' | 'button' | 'mono';
  color?: 'primary' | 'secondary' | 'accent' | 'danger';
};

const variantStyles: Record<NonNullable<ThemedTextProps['variant']>, string> = {
  h1: 'font-anton text-[32px] uppercase leading-[1.2] tracking-normal text-text-primary dark:text-text-primary-dark',
  h2: 'font-anton text-[24px] uppercase leading-[1.2] tracking-normal text-text-primary dark:text-text-primary-dark',
  h3: 'font-jakarta text-[18px] font-bold leading-[1.2] text-text-primary dark:text-text-primary-dark',
  body: 'font-jakarta text-[15px] font-normal leading-[1.5] text-text-primary dark:text-text-primary-dark',
  bodySmall: 'font-jakarta text-[13px] font-normal leading-[1.5] text-text-primary dark:text-text-primary-dark',
  caption: 'font-jakarta text-[11px] font-semibold uppercase tracking-[0.5px] text-text-secondary dark:text-text-secondary-dark',
  button: 'font-jakarta text-[14px] font-bold text-text-primary dark:text-text-primary-dark',
  mono: 'font-jakarta text-[13px] font-medium uppercase text-text-primary dark:text-text-primary-dark',
};

const colorStyles: Record<NonNullable<ThemedTextProps['color']>, string> = {
  primary: 'text-primary dark:text-primary-dark',
  secondary: 'text-secondary dark:text-secondary-dark',
  accent: 'text-accent dark:text-accent-dark',
  danger: 'text-danger dark:text-danger-dark',
};

export function ThemedText(props: ThemedTextProps) {
  const { variant = 'body', color, className = '', ...otherProps } = props;
  const baseStyle = variantStyles[variant];
  const colorStyle = color ? colorStyles[color] : '';

  return <Text className={`${baseStyle} ${colorStyle} ${className}`} {...otherProps} />;
}

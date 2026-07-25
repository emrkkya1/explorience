import { ActivityIndicator } from 'react-native';
import type { ComponentProps } from 'react';

import { PressableScale } from './PressableScale';
import { ThemedText } from './ThemedText';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = ComponentProps<typeof PressableScale> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
};

const variantContainerStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary dark:bg-primary-dark',
  secondary: 'bg-transparent border-[1.5px] border-primary dark:border-primary-dark',
  ghost: 'bg-transparent',
};

const variantTextStyles: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-primary dark:text-primary-dark',
  ghost: 'text-text-primary dark:text-text-primary-dark',
};

export function Button(props: ButtonProps) {
  const { title, variant = 'primary', loading = false, disabled, className = '', ...otherProps } = props;

  return (
    <PressableScale
      className={`h-12 px-6 rounded-md items-center justify-center ${variantContainerStyles[variant]} ${disabled || loading ? 'opacity-50' : ''} ${className}`}
      disabled={disabled || loading}
      {...otherProps}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : undefined} />
      ) : (
        <ThemedText variant="button" className={variantTextStyles[variant]}>
          {title}
        </ThemedText>
      )}
    </PressableScale>
  );
}

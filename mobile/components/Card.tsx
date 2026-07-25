import type { ComponentProps } from 'react';

import { View } from '@/tw';

type CardProps = ComponentProps<typeof View> & {
  accent?: 'primary' | 'accent';
};

export function Card(props: CardProps) {
  const { accent, className = '', ...otherProps } = props;
  const accentClass = accent === 'primary'
    ? 'border-l-4 border-l-primary dark:border-l-primary-dark'
    : accent === 'accent'
      ? 'border-l-4 border-l-accent dark:border-l-accent-dark'
      : '';

  return (
    <View
      className={`rounded-xl p-4 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark ${accentClass} ${className}`}
      {...otherProps}
    />
  );
}

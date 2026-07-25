import type { ComponentProps, ReactNode } from 'react';

import { PressableScale } from './PressableScale';

type IconButtonProps = ComponentProps<typeof PressableScale> & {
  children: ReactNode;
  size?: number;
};

export function IconButton(props: IconButtonProps) {
  const { children, size = 48, className = '', ...otherProps } = props;

  return (
    <PressableScale
      className={`rounded-xl items-center justify-center bg-surface/80 dark:bg-surface-dark/80 border border-border/60 dark:border-border-dark/60 ${className}`}
      style={{ width: size, height: size }}
      {...otherProps}
    >
      {children}
    </PressableScale>
  );
}

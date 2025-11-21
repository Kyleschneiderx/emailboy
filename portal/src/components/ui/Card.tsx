import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

const paddingMap: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ className, padding = 'md', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-white shadow-card border border-black/5',
        paddingMap[padding],
        className,
      )}
      {...props}
    />
  );
}


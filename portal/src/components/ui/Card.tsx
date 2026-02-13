import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'bordered' | 'glow';
};

const paddingMap: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const variantMap: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'bg-slate border border-border',
  elevated: 'bg-graphite border border-border shadow-lg',
  bordered: 'bg-slate/50 border border-border-hover',
  glow: 'bg-slate border border-coral/20 shadow-glow-sm',
};

export function Card({ className, padding = 'md', variant = 'default', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl transition-all duration-200',
        variantMap[variant],
        paddingMap[padding],
        className,
      )}
      {...props}
    />
  );
}

import type { ReactNode } from 'react';
import { Card } from './Card';
import { cn } from '../../lib/cn';

type Trend = 'up' | 'down' | 'neutral';

interface MetricCardProps {
  label: string;
  value: string | number | ReactNode;
  change?: string;
  trend?: Trend;
  icon?: ReactNode;
}

const trendStyles: Record<Trend, string> = {
  up: 'text-semantic-success',
  down: 'text-semantic-danger',
  neutral: 'text-semantic-neutral',
};

export function MetricCard({ label, value, change, trend = 'neutral', icon }: MetricCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm text-text-secondary uppercase tracking-wide">
        <span>{label}</span>
        {icon && <span className="text-text-tertiary">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[32px] font-semibold text-text-primary leading-none">{value}</span>
        {change && (
          <span className={cn('text-sm font-medium', trendStyles[trend])}>
            {trend === 'up' && '▲'}
            {trend === 'down' && '▼'}
            {trend === 'neutral' && '●'} {change}
          </span>
        )}
      </div>
    </Card>
  );
}


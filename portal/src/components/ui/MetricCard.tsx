import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Trend = 'up' | 'down' | 'neutral';

interface MetricCardProps {
  label: string;
  value: string | number | ReactNode;
  change?: string;
  trend?: Trend;
  icon?: ReactNode;
}

const trendConfig: Record<Trend, { color: string; icon: string }> = {
  up: { color: 'text-emerald', icon: '↑' },
  down: { color: 'text-red-400', icon: '↓' },
  neutral: { color: 'text-text-tertiary', icon: '•' },
};

export function MetricCard({ label, value, change, trend = 'neutral', icon }: MetricCardProps) {
  const trendInfo = trendConfig[trend];

  return (
    <div className="group relative overflow-hidden rounded-xl bg-slate border border-border p-6 transition-all duration-300 hover:border-border-hover hover:bg-graphite">
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-coral/0 to-coral/0 group-hover:from-coral/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            {label}
          </span>
          {icon && (
            <span className="text-text-muted group-hover:text-text-tertiary transition-colors">
              {icon}
            </span>
          )}
        </div>

        <div className="flex items-end justify-between gap-4">
          <span className="font-mono text-3xl font-semibold text-text-primary tracking-tight">
            {value}
          </span>
          {change && (
            <div className={cn('flex items-center gap-1 text-sm font-medium', trendInfo.color)}>
              <span className="text-xs">{trendInfo.icon}</span>
              <span>{change}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

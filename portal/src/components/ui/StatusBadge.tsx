import { cn } from '../../lib/cn';

type StatusVariant = 'active' | 'canceled' | 'trialing' | 'warning' | 'inactive' | 'free';

const variantStyles: Record<StatusVariant, string> = {
  active: 'bg-emerald/10 text-emerald border-emerald/20',
  canceled: 'bg-red-400/10 text-red-400 border-red-400/20',
  trialing: 'bg-azure/10 text-azure border-azure/20',
  warning: 'bg-amber/10 text-amber border-amber/20',
  inactive: 'bg-text-muted/10 text-text-tertiary border-text-muted/20',
  free: 'bg-text-muted/10 text-text-secondary border-text-muted/20',
};

const dotStyles: Record<StatusVariant, string> = {
  active: 'bg-emerald shadow-[0_0_8px] shadow-emerald/50',
  canceled: 'bg-red-400 shadow-[0_0_8px] shadow-red-400/50',
  trialing: 'bg-azure shadow-[0_0_8px] shadow-azure/50',
  warning: 'bg-amber shadow-[0_0_8px] shadow-amber/50',
  inactive: 'bg-text-tertiary',
  free: 'bg-text-tertiary',
};

interface StatusBadgeProps {
  children: string;
  variant?: StatusVariant;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ children, variant = 'active', className, showDot = true }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider border transition-all duration-200',
        variantStyles[variant],
        className,
      )}
    >
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotStyles[variant])} />
      )}
      {children}
    </span>
  );
}

import { cn } from '../../lib/cn';

type StatusVariant = 'active' | 'canceled' | 'trialing' | 'warning';

const variantStyles: Record<StatusVariant, string> = {
  active: 'bg-[#F0F9F4] text-semantic-success border border-[#D4EDD9]',
  canceled: 'bg-[#FFF3F0] text-semantic-danger border border-[#FFE0D9]',
  trialing: 'bg-[#FFF8E6] text-semantic-warning border border-[#FFE8B3]',
  warning: 'bg-[#FFF8E6] text-semantic-warning border border-[#FFE8B3]',
};

interface StatusBadgeProps {
  children: string;
  variant?: StatusVariant;
  className?: string;
}

export function StatusBadge({ children, variant = 'active', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-3 py-1 text-[11px] font-medium uppercase tracking-wide',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}


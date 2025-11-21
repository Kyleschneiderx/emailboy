import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

const variantStyles = {
  primary:
    'bg-accent-primary text-text-onAccent shadow-card hover:bg-[#E64A2E] focus-visible:outline-accent-secondary',
  secondary:
    'bg-white text-text-secondary border border-[#E0E0E0] hover:bg-[#F9F9F9] focus-visible:outline-accent-secondary',
  ghost:
    'bg-transparent text-text-secondary hover:bg-black/5 focus-visible:outline-accent-secondary',
  danger:
    'bg-semantic-danger text-text-onAccent hover:bg-[#E64A2E] focus-visible:outline-semantic-danger',
} as const;

const sizeStyles = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          loading && 'relative cursor-not-allowed opacity-75',
          className,
        )}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';


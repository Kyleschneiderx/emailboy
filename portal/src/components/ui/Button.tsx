import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const baseStyles =
  'relative inline-flex items-center justify-center gap-2 font-display font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-slate disabled:pointer-events-none disabled:opacity-50';

const variantStyles = {
  primary:
    'bg-gradient-to-r from-coral to-coral-light text-white shadow-lg shadow-coral/20 hover:shadow-xl hover:shadow-coral/30 hover:scale-[1.02] active:scale-[0.98]',
  secondary:
    'bg-graphite text-text-primary border border-border hover:border-border-hover hover:bg-smoke active:bg-mist',
  ghost:
    'bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/5 active:bg-white/10',
  danger:
    'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30',
  outline:
    'bg-transparent text-coral border border-coral/40 hover:bg-coral/10 hover:border-coral/60',
} as const;

const sizeStyles = {
  sm: 'h-9 px-4 text-sm rounded-lg',
  md: 'h-11 px-5 text-sm rounded-lg',
  lg: 'h-12 px-6 text-base rounded-xl',
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
          loading && 'cursor-not-allowed',
          className,
        )}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center bg-inherit rounded-inherit">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        )}
        <span className={cn(loading && 'invisible')}>{children}</span>
      </button>
    );
  },
);

Button.displayName = 'Button';

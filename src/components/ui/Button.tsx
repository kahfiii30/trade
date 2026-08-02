import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          variant === 'primary' && 'glass-button-primary',
          variant === 'secondary' && 'glass-button',
          variant === 'danger' && 'bg-accent-red/10 text-accent-red border border-accent-red/20 hover:bg-accent-red/20 rounded-xl px-4 py-2.5 font-medium transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 hover:shadow-glow-red',
          variant === 'ghost' && 'hover:bg-glass-hover text-gray-300 hover:text-white rounded-xl px-4 py-2.5 font-medium transition-all duration-300 active:scale-95 flex items-center justify-center gap-2',
          (disabled || isLoading) && 'opacity-50 cursor-not-allowed active:scale-100 hover:bg-transparent hover:shadow-none',
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

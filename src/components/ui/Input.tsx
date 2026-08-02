import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-[13px] font-semibold tracking-wide text-gray-400 uppercase">{label}</label>}
        <input
          ref={ref}
          className={cn(
            'bg-black/30 border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-cyan/50 focus:ring-1 focus:ring-accent-cyan/30 focus:bg-black/50 transition-all duration-300 text-gray-100 placeholder-gray-600 shadow-inner',
            error && 'border-accent-red/50 focus:border-accent-red focus:ring-accent-red/30',
            className
          )}
          {...props}
        />
        {error && <span className="text-[11px] font-medium text-accent-red mt-1">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

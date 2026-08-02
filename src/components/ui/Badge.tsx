import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'win' | 'loss' | 'be' | 'neutral' | 'accent' | 'gold' | 'purple' | 'long' | 'short' | 'indigo';
  size?: 'sm' | 'md';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', size = 'md', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 font-mono font-medium tracking-tight uppercase transition-all',
          size === 'sm' ? 'px-1.5 py-0.5 text-[10px] rounded' : 'px-2 py-0.5 text-[11px] rounded-md',
          variant === 'win' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
          variant === 'loss' && 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
          variant === 'be' && 'bg-slate-700/20 text-slate-400 border border-slate-700/30',
          variant === 'neutral' && 'bg-white/[0.03] text-slate-300 border border-white/[0.06]',
          variant === 'accent' && 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
          variant === 'gold' && 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
          variant === 'purple' && 'bg-purple-500/10 text-purple-300 border border-purple-500/20',
          variant === 'indigo' && 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20',
          variant === 'long' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
          variant === 'short' && 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: 'gold' | 'emerald' | 'rose' | 'cyan' | 'indigo' | 'none';
  variant?: 'glass' | 'solid' | 'interactive';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, glow = 'none', variant = 'glass', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-2xl transition-all duration-300',
          variant === 'glass' && 'bg-[#0c0f17]/80 backdrop-blur-xl border border-white/[0.06] shadow-[0_12px_32px_rgba(0,0,0,0.5)]',
          variant === 'solid' && 'bg-[#0c0f17] border border-white/[0.06]',
          variant === 'interactive' && 'bg-[#0c0f17]/80 backdrop-blur-xl border border-white/[0.06] hover:border-amber-500/30 hover:bg-[#121622]/90 cursor-pointer shadow-lg hover:shadow-black/60',
          glow === 'gold' && 'border-amber-500/25 shadow-[0_0_25px_rgba(212,175,55,0.1)]',
          glow === 'emerald' && 'border-emerald-500/25 shadow-[0_0_25px_rgba(16,185,129,0.1)]',
          glow === 'rose' && 'border-rose-500/25 shadow-[0_0_25px_rgba(244,63,94,0.1)]',
          glow === 'cyan' && 'border-sky-500/25 shadow-[0_0_25px_rgba(56,189,248,0.1)]',
          glow === 'indigo' && 'border-indigo-500/25 shadow-[0_0_25px_rgba(99,102,241,0.1)]',
          'p-5 sm:p-6',
          className
        )}
        {...props}
      >
        {/* Delicate top specular reflection */}
        <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

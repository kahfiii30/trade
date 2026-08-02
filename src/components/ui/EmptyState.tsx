import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Card } from './Card';
import { Terminal } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  hint?: string;
  className?: string;
}

export const EmptyState = ({ 
  icon = <Terminal className="w-8 h-8 text-accent-cyan" />, 
  title, 
  description, 
  action, 
  hint,
  className 
}: EmptyStateProps) => {
  return (
    <Card className={cn("flex flex-col items-center justify-center p-10 sm:p-14 text-center border-dashed border-white/10 relative overflow-hidden", className)}>
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-accent-cyan shadow-[0_0_30px_rgba(0,229,255,0.2)]">
          {icon}
        </div>
        <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
        </span>
      </div>

      <h3 className="text-xl font-bold font-brand text-white mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
        {description}
      </p>

      {hint && (
        <div className="mb-6 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs font-mono text-cyan-300 max-w-sm">
          💡 {hint}
        </div>
      )}

      {action && (
        <div className="flex items-center gap-3">{action}</div>
      )}
    </Card>
  );
};

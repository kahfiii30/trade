import type { ReactNode } from 'react';
import { Card } from './Card';
import { cn } from '../../utils/cn';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const ChartCard = ({ title, subtitle, badge, action, children, className }: ChartCardProps) => {
  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.04]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold font-sans text-white tracking-tight">{title}</h3>
            {badge && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.04] text-slate-300 border border-white/[0.06]">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && (
          <div className="flex items-center gap-2">{action}</div>
        )}
      </div>
      <div className="flex-1 w-full min-h-[300px]">
        {children}
      </div>
    </Card>
  );
};

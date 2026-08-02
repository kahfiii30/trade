import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  badge?: string;
  description?: string;
  action?: ReactNode;
}

export const PageHeader = ({ title, badge, description, action }: PageHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-white/[0.04]">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold font-sans text-white tracking-[-0.02em]">
            {title}
          </h1>
          {badge && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-[0.08em] bg-amber-500/10 text-amber-300 border border-amber-500/25">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-normal leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {action}
        </div>
      )}
    </div>
  );
};

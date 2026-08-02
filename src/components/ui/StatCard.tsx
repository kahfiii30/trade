import { Card } from './Card';
import { cn } from '../../utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  glow?: 'gold' | 'emerald' | 'rose' | 'cyan' | 'indigo' | 'none';
  accentColor?: 'gold' | 'emerald' | 'rose' | 'cyan' | 'indigo';
  className?: string;
}

export const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  trend, 
  trendValue, 
  icon, 
  glow = 'none',
  accentColor = 'gold',
  className 
}: StatCardProps) => {
  return (
    <Card 
      glow={glow} 
      className={cn(
        "flex flex-col justify-between relative overflow-hidden group hover:border-white/10 transition-all duration-200", 
        className
      )}
    >
      <div>
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className={cn(
              "w-1 h-2.5 rounded-full",
              accentColor === 'gold' && "bg-amber-400/90",
              accentColor === 'emerald' && "bg-emerald-400/90",
              accentColor === 'rose' && "bg-rose-400/90",
              accentColor === 'cyan' && "bg-sky-400/90",
              accentColor === 'indigo' && "bg-indigo-400/90",
            )} />
            <h3 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase font-sans">
              {title}
            </h3>
          </div>
          {icon && (
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 border",
              accentColor === 'gold' && "bg-amber-500/[0.08] text-amber-300 border-amber-500/20",
              accentColor === 'emerald' && "bg-emerald-500/[0.08] text-emerald-300 border-emerald-500/20",
              accentColor === 'rose' && "bg-rose-500/[0.08] text-rose-300 border-rose-500/20",
              accentColor === 'cyan' && "bg-sky-500/[0.08] text-sky-300 border-sky-500/20",
              accentColor === 'indigo' && "bg-indigo-500/[0.08] text-indigo-300 border-indigo-500/20",
            )}>
              {icon}
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2.5">
          <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white">
            {value}
          </span>
          {trendValue && (
            <span className={cn(
              "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1",
              trend === 'up' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
              trend === 'down' && "bg-rose-500/10 text-rose-400 border border-rose-500/20",
              trend === 'neutral' && "bg-slate-500/10 text-slate-400 border border-slate-500/20",
            )}>
              {trend === 'up' ? '▲ +' : trend === 'down' ? '▼ ' : ''}{trendValue}
            </span>
          )}
        </div>
      </div>

      {subtitle && (
        <div className="mt-3 pt-2.5 border-t border-white/[0.05] text-[11px] text-slate-400 font-medium">
          {subtitle}
        </div>
      )}
    </Card>
  );
};

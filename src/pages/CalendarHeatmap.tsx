import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Trade } from '../types/database';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, Award, DollarSign } from 'lucide-react';
import { cn } from '../utils/cn';
import { PORTFOLIO_USER_ID } from '../lib/constants';
import { 
  getTradeDate, 
  getTradeNetPnL, 
  isTradeWin, 
  isTradeLoss 
} from '../utils/tradeUtils';

export const CalendarHeatmap = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const targetUserId = user?.id || PORTFOLIO_USER_ID;
    
    const fetchTrades = async () => {
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', targetUserId)
          .order('date', { ascending: true });
          
        if (error) throw error;
        setTrades(data || []);
      } catch (error) {
        console.error('Error fetching trades for calendar:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrades();
  }, [user]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const dailyStats: Record<string, { pnl: number; count: number; wins: number; losses: number }> = {};
  trades.forEach(t => {
    const tradeTime = getTradeDate(t);
    if (!tradeTime) return;
    const dateStr = format(new Date(tradeTime), 'yyyy-MM-dd');
    const net = getTradeNetPnL(t);

    if (!dailyStats[dateStr]) dailyStats[dateStr] = { pnl: 0, count: 0, wins: 0, losses: 0 };
    dailyStats[dateStr].pnl += net;
    dailyStats[dateStr].count += 1;
    if (isTradeWin(t)) dailyStats[dateStr].wins += 1;
    if (isTradeLoss(t)) dailyStats[dateStr].losses += 1;
  });

  // Calculate monthly summary
  const currentMonthTrades = trades.filter(t => {
    const tradeTime = getTradeDate(t);
    return tradeTime && isSameMonth(new Date(tradeTime), currentDate);
  });
  
  const monthlyPnL = currentMonthTrades.reduce((sum, t) => {
    return sum + getTradeNetPnL(t);
  }, 0);
  const monthlyTradesCount = currentMonthTrades.length;

  // Green days vs Red days in month
  let greenDays = 0;
  let redDays = 0;
  Object.keys(dailyStats).forEach(dateStr => {
    const d = new Date(dateStr);
    if (isSameMonth(d, currentDate)) {
      if (dailyStats[dateStr].pnl > 0) greenDays++;
      if (dailyStats[dateStr].pnl < 0) redDays++;
    }
  });

  const totalActiveDays = greenDays + redDays;
  const consistencyRate = totalActiveDays > 0 ? ((greenDays / totalActiveDays) * 100).toFixed(0) : '0';

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <PageHeader 
        title="Calendar Performance Heatmap"
        badge="DAILY LEDGER"
        description="Daily net returns, green vs red day distribution, and trading rhythm across the month."
      />

      {/* Monthly Summary Strip */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-300 border border-amber-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Month Net Return</p>
              <p className={`text-xl font-extrabold font-mono ${
                monthlyPnL > 0 ? 'text-emerald-400' : monthlyPnL < 0 ? 'text-rose-400' : 'text-slate-300'
              }`}>
                {monthlyPnL >= 0 ? '+' : ''}${monthlyPnL.toFixed(2)}
              </p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Trading Days Breakdown</p>
              <p className="text-xl font-extrabold font-mono text-white">
                <span className="text-emerald-400">{greenDays} Green</span> / <span className="text-rose-400">{redDays} Red</span>
              </p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-300 border border-indigo-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Day Consistency Rate</p>
              <p className="text-xl font-extrabold font-mono text-amber-300">
                {consistencyRate}% ({monthlyTradesCount} Trades)
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Calendar Header Navigation */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold font-sans text-white">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors border border-white/[0.06]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold font-mono transition-colors border border-amber-500/20"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors border border-white/[0.06]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="py-2 text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const stat = dailyStats[dateStr];
            const isCurMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);

            let bgClass = "bg-white/[0.01] border-white/[0.04]";
            let textPnLClass = "text-slate-400";

            if (stat && stat.count > 0) {
              if (stat.pnl > 0) {
                bgClass = "bg-emerald-500/[0.08] border-emerald-500/20";
                textPnLClass = "text-emerald-400 font-bold";
              } else if (stat.pnl < 0) {
                bgClass = "bg-rose-500/[0.08] border-rose-500/20";
                textPnLClass = "text-rose-400 font-bold";
              } else {
                bgClass = "bg-white/[0.03] border-white/10";
                textPnLClass = "text-slate-300";
              }
            }

            return (
              <div
                key={day.toString()}
                className={cn(
                  "min-h-[85px] sm:min-h-[95px] p-2.5 rounded-xl border flex flex-col justify-between transition-all duration-150",
                  !isCurMonth && "opacity-25 pointer-events-none",
                  isDayToday && "ring-1 ring-amber-400/60",
                  bgClass
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-xs font-mono font-bold",
                    isDayToday ? "text-amber-300" : "text-slate-300"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {stat && stat.count > 0 && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-300 border border-white/[0.05]">
                      {stat.count}T
                    </span>
                  )}
                </div>

                {stat && stat.count > 0 ? (
                  <div className="mt-1">
                    <span className={cn("text-xs sm:text-sm font-mono block", textPnLClass)}>
                      {stat.pnl > 0 ? '+' : ''}${stat.pnl.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-600 font-mono">-</div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

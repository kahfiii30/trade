import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Trade } from '../types/database';
import { ChartCard } from '../components/ui/ChartCard';
import { StatCard } from '../components/ui/StatCard';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Card } from '../components/ui/Card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, ReferenceLine
} from 'recharts';
import { 
  TrendingUp, 
  BrainCircuit, 
  Award, 
  DollarSign,
  Compass,
  Layers
} from 'lucide-react';
import { PORTFOLIO_USER_ID } from '../lib/constants';

export const Analytics = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const targetUserId = user?.id || PORTFOLIO_USER_ID;
    
    const fetchTrades = async () => {
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', targetUserId)
          .order('close_time', { ascending: true });
          
        if (error) throw error;
        setTrades(data || []);
      } catch (error) {
        console.error('Error fetching trades for analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrades();
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-white/5 rounded-xl w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white/5 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  // Analytics Processing
  const winTrades = trades.filter(t => t.result === 'Win' || Number(t.pnl) > 0);
  const lossTrades = trades.filter(t => t.result === 'Loss' || Number(t.pnl) < 0);
  const beTrades = trades.filter(t => t.result === 'BE' || Number(t.pnl) === 0);

  const grossProfit = winTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
  const grossLoss = Math.abs(lossTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0));
  const netPnL = grossProfit - grossLoss;
  const winRate = trades.length > 0 ? ((winTrades.length / trades.length) * 100).toFixed(1) : '0.0';

  // Win/Loss Ratio Data
  const wlData = [
    { name: 'Wins', value: winTrades.length, color: '#10b981' },
    { name: 'Losses', value: lossTrades.length, color: '#f43f5e' },
    { name: 'Breakeven', value: beTrades.length, color: '#64748b' },
  ].filter(d => d.value > 0);

  // Pair Performance Matrix
  const pairStats: Record<string, { pnl: number; count: number; wins: number }> = {};
  trades.forEach(t => {
    if (!pairStats[t.pair]) pairStats[t.pair] = { pnl: 0, count: 0, wins: 0 };
    const net = Number(t.pnl) - Number(t.commission || 0) - Number(t.swap || 0);
    pairStats[t.pair].pnl += net;
    pairStats[t.pair].count += 1;
    if (t.result === 'Win') pairStats[t.pair].wins += 1;
  });

  const pairData = Object.keys(pairStats).map(pair => ({
    pair,
    pnl: pairStats[pair].pnl,
    count: pairStats[pair].count,
    winrate: ((pairStats[pair].wins / pairStats[pair].count) * 100).toFixed(0)
  })).sort((a, b) => b.pnl - a.pnl);

  // Session Statistics
  const sessionStats = {
    asian: { name: 'Asian / Tokyo (07:00 - 15:00 WIB)', trades: 0, pnl: 0, wins: 0 },
    london: { name: 'London (15:00 - 23:00 WIB)', trades: 0, pnl: 0, wins: 0 },
    ny: { name: 'New York (20:00 - 04:00 WIB)', trades: 0, pnl: 0, wins: 0 }
  };

  trades.forEach(t => {
    const tradeTime = t.close_time || t.open_time || t.date || new Date().toISOString();
    const d = new Date(tradeTime);
    const hour = d.getUTCHours();
    const net = Number(t.pnl) - Number(t.commission || 0) - Number(t.swap || 0);
    const isWin = t.result === 'Win';

    if (hour >= 0 && hour < 8) {
      sessionStats.asian.trades++;
      sessionStats.asian.pnl += net;
      if (isWin) sessionStats.asian.wins++;
    } else if (hour >= 8 && hour < 13) {
      sessionStats.london.trades++;
      sessionStats.london.pnl += net;
      if (isWin) sessionStats.london.wins++;
    } else {
      sessionStats.ny.trades++;
      sessionStats.ny.pnl += net;
      if (isWin) sessionStats.ny.wins++;
    }
  });

  // Day of Week Performance
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayStats: Record<string, { pnl: number; count: number }> = {
    Mon: { pnl: 0, count: 0 },
    Tue: { pnl: 0, count: 0 },
    Wed: { pnl: 0, count: 0 },
    Thu: { pnl: 0, count: 0 },
    Fri: { pnl: 0, count: 0 },
  };

  trades.forEach(t => {
    const tradeTime = t.close_time || t.open_time || t.date || new Date().toISOString();
    const dayName = days[new Date(tradeTime).getDay()];
    if (dayStats[dayName]) {
      const net = Number(t.pnl) - Number(t.commission || 0) - Number(t.swap || 0);
      dayStats[dayName].pnl += net;
      dayStats[dayName].count += 1;
    }
  });

  const dayData = Object.keys(dayStats).map(day => ({
    day,
    pnl: dayStats[day].pnl,
    count: dayStats[day].count
  }));

  // Emotion Impact
  const emotionStats: Record<string, { pnl: number; count: number }> = {};
  trades.forEach(t => {
    const em = t.emotion || 'Disciplined';
    if (!emotionStats[em]) emotionStats[em] = { pnl: 0, count: 0 };
    const net = Number(t.pnl) - Number(t.commission || 0) - Number(t.swap || 0);
    emotionStats[em].pnl += net;
    emotionStats[em].count += 1;
  });

  const emotionData = Object.keys(emotionStats).map(emotion => ({
    emotion,
    pnl: emotionStats[emotion].pnl,
    count: emotionStats[emotion].count
  })).sort((a, b) => b.pnl - a.pnl);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <PageHeader 
        title="Edge & Statistical Intelligence"
        badge="PRECISION ANALYTICS"
        description="Deep statistical analysis across market sessions, asset pairs, psychology, and weekday performance."
      />

      {trades.length === 0 ? (
        <EmptyState 
          title="Data Analitik Belum Tersedia"
          description="Lakukan beberapa transaksi atau sinkronkan data MT5 Anda untuk melihat laporan statistik mendalam di halaman ini."
        />
      ) : (
        <>
          {/* Top Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Net Cumulative Return" 
              value={`${netPnL >= 0 ? '+' : ''}$${netPnL.toFixed(2)}`}
              subtitle={`Gross: +$${grossProfit.toFixed(1)} | -$${grossLoss.toFixed(1)}`}
              glow={netPnL >= 0 ? 'emerald' : 'rose'}
              accentColor={netPnL >= 0 ? 'emerald' : 'rose'}
              icon={<DollarSign className="w-4 h-4" />}
            />
            <StatCard 
              title="Win / Loss Ratio" 
              value={`${winRate}%`}
              subtitle={`${winTrades.length} Wins vs ${lossTrades.length} Losses`}
              glow="gold"
              accentColor="gold"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <StatCard 
              title="Top Performing Asset" 
              value={pairData[0]?.pair || 'N/A'}
              subtitle={`Profit: +$${(pairData[0]?.pnl || 0).toFixed(2)} (${pairData[0]?.winrate || 0}% WR)`}
              glow="gold"
              accentColor="gold"
              icon={<Award className="w-4 h-4" />}
            />
            <StatCard 
              title="Best Trading Session" 
              value={sessionStats.london.pnl > sessionStats.ny.pnl ? 'London' : 'New York'}
              subtitle="Highest net profitability"
              glow="indigo"
              accentColor="indigo"
              icon={<Compass className="w-4 h-4" />}
            />
          </div>

          {/* Market Session Performance Matrix (PRO FEATURE) */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.05]">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Market Session Edge Breakdown</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">HOURLY EDGE MATRIX</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* London */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white">London Session</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>
                <div className="text-2xl font-mono font-bold text-white">
                  {sessionStats.london.pnl >= 0 ? '+' : ''}${sessionStats.london.pnl.toFixed(2)}
                </div>
                <div className="pt-2 border-t border-white/[0.04] flex justify-between text-xs text-slate-400 font-mono">
                  <span>{sessionStats.london.trades} Trades</span>
                  <span>{sessionStats.london.trades > 0 ? ((sessionStats.london.wins / sessionStats.london.trades) * 100).toFixed(0) : 0}% Win Rate</span>
                </div>
              </div>

              {/* New York */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white">New York Session</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    High Volatility
                  </span>
                </div>
                <div className="text-2xl font-mono font-bold text-white">
                  {sessionStats.ny.pnl >= 0 ? '+' : ''}${sessionStats.ny.pnl.toFixed(2)}
                </div>
                <div className="pt-2 border-t border-white/[0.04] flex justify-between text-xs text-slate-400 font-mono">
                  <span>{sessionStats.ny.trades} Trades</span>
                  <span>{sessionStats.ny.trades > 0 ? ((sessionStats.ny.wins / sessionStats.ny.trades) * 100).toFixed(0) : 0}% Win Rate</span>
                </div>
              </div>

              {/* Asian */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white">Asian / Tokyo Session</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                    Consolidation
                  </span>
                </div>
                <div className="text-2xl font-mono font-bold text-white">
                  {sessionStats.asian.pnl >= 0 ? '+' : ''}${sessionStats.asian.pnl.toFixed(2)}
                </div>
                <div className="pt-2 border-t border-white/[0.04] flex justify-between text-xs text-slate-400 font-mono">
                  <span>{sessionStats.asian.trades} Trades</span>
                  <span>{sessionStats.asian.trades > 0 ? ((sessionStats.asian.wins / sessionStats.asian.trades) * 100).toFixed(0) : 0}% Win Rate</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Charts Row 1: Donut Distribution & Weekday Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartCard 
              title="Outcome Distribution" 
              subtitle="Win, loss, and breakeven proportions"
              className="h-[360px]"
            >
              <div className="h-full flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={wlData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {wlData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0c0f17', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-6 mt-2 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-slate-300 font-medium">{winTrades.length} Wins</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    <span className="text-slate-300 font-medium">{lossTrades.length} Losses</span>
                  </div>
                  {beTrades.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                      <span className="text-slate-300 font-medium">{beTrades.length} BE</span>
                    </div>
                  )}
                </div>
              </div>
            </ChartCard>

            {/* Weekday Breakdown */}
            <div className="lg:col-span-2">
              <ChartCard 
                title="Weekday Performance Distribution" 
                subtitle="Net P&L generated across trading days"
                badge="DAY OF WEEK"
                className="h-[360px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" tickFormatter={(v) => `$${v}`} />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0c0f17', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      formatter={(v: any) => [`${Number(v) >= 0 ? '+' : ''}$${Number(v).toFixed(2)}`, 'Net PnL']}
                    />
                    <Bar dataKey="pnl" fill="#d4af37" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>

          {/* Asset Pair Matrix & Psychology Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Pair Leaderboard */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">Asset Pair Profitability Matrix</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">RANKED BY PnL</span>
              </div>

              <div className="space-y-2.5">
                {pairData.map((item, idx) => {
                  const isProfit = item.pnl >= 0;
                  return (
                    <div 
                      key={item.pair}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between hover:border-amber-500/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-white/[0.04] text-slate-400 font-mono text-xs flex items-center justify-center font-bold">
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-sans font-semibold text-sm text-white block">{item.pair}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{item.count} Trades • {item.winrate}% WR</span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className={`text-sm font-bold block ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {isProfit ? '+' : ''}${item.pnl.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Psychology & State Analysis */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">Psychology & Discipline Correlation</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">MINDSET IMPACT</span>
              </div>

              <div className="space-y-2.5">
                {emotionData.map((item) => {
                  const isProfit = item.pnl >= 0;
                  return (
                    <div 
                      key={item.emotion}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between"
                    >
                      <div>
                        <span className="font-medium text-xs text-slate-200 block">{item.emotion}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{item.count} executions</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className={`text-sm font-bold ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {isProfit ? '+' : ''}${item.pnl.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

          </div>
        </>
      )}
    </div>
  );
};

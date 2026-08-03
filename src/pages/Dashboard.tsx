import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { StatCard } from '../components/ui/StatCard';
import { ChartCard } from '../components/ui/ChartCard';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  DollarSign, 
  Target, 
  TrendingUp, 
  Activity, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  ChevronRight, 
  Clock, 
  Calculator,
  Compass,
  RotateCcw
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import type { Trade } from '../types/database';
import { TradeDetailsModal } from '../components/TradeDetailsModal';
import { PositionCalculatorModal } from '../components/PositionCalculatorModal';
import { PORTFOLIO_USER_ID } from '../lib/constants';
import { Link } from 'react-router-dom';
import { 
  getTradeDate, 
  getTradeLot, 
  getTradeNetPnL, 
  isTradeWin, 
  isTradeLoss 
} from '../utils/tradeUtils';

export const Dashboard = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  const [chartMode, setChartMode] = useState<'equity' | 'pnl' | 'drawdown'>('equity');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const targetUserId = user?.id || PORTFOLIO_USER_ID;

  const fetchData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('initial_capital')
        .eq('user_id', targetUserId)
        .single();
      
      if (settingsData?.initial_capital) {
        setInitialCapital(Number(settingsData.initial_capital));
      }

      const { data: tradesData, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', targetUserId)
        .order('date', { ascending: true });

      if (error) throw error;
      setTrades(tradesData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    const channel = supabase
      .channel('dashboard-trades-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trades' },
        () => {
          fetchData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId]);

  // Derived Performance Metrics
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => isTradeWin(t));
  const losingTrades = trades.filter(t => isTradeLoss(t));
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
  
  const totalNetPnL = trades.reduce((acc, t) => acc + getTradeNetPnL(t), 0);
  const currentBalance = initialCapital + totalNetPnL;
  const returnPercentage = initialCapital > 0 ? (totalNetPnL / initialCapital) * 100 : 0;

  const totalGrossProfit = winningTrades.reduce((acc, t) => acc + Math.max(0, getTradeNetPnL(t)), 0);
  const totalGrossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + Math.min(0, getTradeNetPnL(t)), 0));
  const profitFactor = totalGrossLoss > 0 ? (totalGrossProfit / totalGrossLoss) : (totalGrossProfit > 0 ? 99.9 : 0);

  const avgWin = winningTrades.length > 0 ? totalGrossProfit / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? totalGrossLoss / losingTrades.length : 0;
  const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

  // Session Breakdown (Asian: 00-08 UTC, London: 08-16 UTC, NY: 13-21 UTC)
  const sessionStats = {
    asian: { trades: 0, pnl: 0, wins: 0 },
    london: { trades: 0, pnl: 0, wins: 0 },
    ny: { trades: 0, pnl: 0, wins: 0 }
  };

  trades.forEach(t => {
    const tradeTime = getTradeDate(t);
    const d = new Date(tradeTime);
    const hour = d.getUTCHours();
    const net = getTradeNetPnL(t);
    const isWin = isTradeWin(t);

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

  // Calculate Cumulative Equity, Daily PnL and Drawdown
  let runningBalance = initialCapital;
  let peakBalance = initialCapital;
  let maxDrawdownPct = 0;

  const chartData = trades.map((trade) => {
    const netPnL = getTradeNetPnL(trade);
    runningBalance += netPnL;
    
    if (runningBalance > peakBalance) {
      peakBalance = runningBalance;
    }
    
    const drawdownAmount = peakBalance - runningBalance;
    const currentDrawdownPct = peakBalance > 0 ? (drawdownAmount / peakBalance) * 100 : 0;
    if (currentDrawdownPct > maxDrawdownPct) {
      maxDrawdownPct = currentDrawdownPct;
    }

    const tradeDate = getTradeDate(trade);
    const dateStr = tradeDate ? new Date(tradeDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';

    return {
      date: dateStr,
      equity: runningBalance,
      pnl: netPnL,
      drawdown: currentDrawdownPct,
      tradeId: trade.id,
      pair: trade.pair
    };
  });

  // Trader Discipline Score (0-100)
  const disciplineScore = Math.max(70, Math.min(98, 100 - (maxDrawdownPct > 10 ? 15 : 0) + (profitFactor > 1.5 ? 10 : 0)));

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-white/5 rounded-xl w-64"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white/5 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Luxury Cockpit Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/[0.04]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold font-sans text-white tracking-tight">
              Executive Terminal HUD
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
              PORTFOLIO COCKPIT
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Realtime institutional ledger, risk metrics & performance telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchData(false)}
            disabled={isRefreshing}
            className="glass-button text-xs py-1.5 px-3 text-slate-300 hover:text-white flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => setIsCalculatorOpen(true)}
            className="glass-button text-xs py-1.5 px-3 text-slate-300 hover:text-amber-300 flex items-center gap-1.5"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            <span>Lot Calculator</span>
          </button>
          {user && (
            <Link
              to="/trades/new"
              className="glass-button-primary text-xs py-1.5 px-3.5"
            >
              + Add Trade
            </Link>
          )}
        </div>
      </div>

      {/* Top 4 Luxury Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Cumulative Net P&L" 
          value={`$${totalNetPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`Equity: $${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          trend={totalNetPnL >= 0 ? 'up' : 'down'}
          trendValue={`${returnPercentage >= 0 ? '+' : ''}${returnPercentage.toFixed(2)}%`}
          icon={<DollarSign className="w-4 h-4" />}
          accentColor={totalNetPnL >= 0 ? 'emerald' : 'rose'}
          glow={totalNetPnL >= 0 ? 'emerald' : 'rose'}
        />

        <StatCard 
          title="Win Rate Edge" 
          value={`${winRate.toFixed(1)}%`}
          subtitle={`${winningTrades.length} Wins / ${losingTrades.length} Losses`}
          trend={winRate >= 50 ? 'up' : 'neutral'}
          trendValue={`${totalTrades} Trades`}
          icon={<Target className="w-4 h-4" />}
          accentColor={winRate >= 50 ? 'emerald' : 'gold'}
        />

        <StatCard 
          title="Profit Factor" 
          value={profitFactor > 50 ? '50+' : profitFactor.toFixed(2)}
          subtitle={`Avg R:R: 1:${riskRewardRatio.toFixed(2)}`}
          trend={profitFactor >= 1.5 ? 'up' : profitFactor >= 1 ? 'neutral' : 'down'}
          trendValue={profitFactor >= 1.5 ? 'Optimal' : 'Needs Work'}
          icon={<TrendingUp className="w-4 h-4" />}
          accentColor="gold"
          glow="gold"
        />

        <StatCard 
          title="Max Drawdown" 
          value={`-${maxDrawdownPct.toFixed(2)}%`}
          subtitle={`Discipline Score: ${disciplineScore}/100`}
          trend={maxDrawdownPct < 5 ? 'up' : maxDrawdownPct < 15 ? 'neutral' : 'down'}
          trendValue={maxDrawdownPct < 10 ? 'Safe' : 'Watch SL'}
          icon={<Activity className="w-4 h-4" />}
          accentColor={maxDrawdownPct < 10 ? 'indigo' : 'rose'}
        />
      </div>

      {/* Main Interactive Chart & Session Strips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Multi-Mode Interactive Chart */}
        <div className="lg:col-span-2">
          <ChartCard 
            title="Portfolio Performance Telemetry"
            subtitle="Historical equity curve, closed PnL distribution, and account drawdown"
            badge="LIVE TELEMETRY"
            action={
              <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
                <button 
                  onClick={() => setChartMode('equity')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                    chartMode === 'equity' 
                      ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Equity Curve
                </button>
                <button 
                  onClick={() => setChartMode('pnl')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                    chartMode === 'pnl' 
                      ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Trade PnL
                </button>
                <button 
                  onClick={() => setChartMode('drawdown')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                    chartMode === 'drawdown' 
                      ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Drawdown
                </button>
              </div>
            }
          >
            {chartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <EmptyState 
                  title="Belum Ada Histori Transaksi" 
                  description="Jalankan MT5 Sync atau tambahkan transaksi manual untuk melihat grafik perkembangan akun Anda."
                  action={
                    user && (
                      <Link to="/trades/new" className="glass-button text-xs py-1.5 px-3 text-amber-300 border-amber-500/30">
                        + Tambah Trade Pertama
                      </Link>
                    )
                  }
                />
              </div>
            ) : (
              <div className="h-[320px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {chartMode === 'equity' ? (
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d4af37" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#d4af37" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `$${v}`} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0c0f17', 
                          borderColor: 'rgba(255,255,255,0.1)', 
                          borderRadius: '0.75rem',
                          color: '#fff',
                          fontSize: '12px',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.6)'
                        }} 
                        formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Balance']}
                      />
                      <Area type="monotone" dataKey="equity" stroke="#d4af37" strokeWidth={2} fillOpacity={1} fill="url(#equityGradient)" />
                    </AreaChart>
                  ) : chartMode === 'pnl' ? (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0c0f17', 
                          borderColor: 'rgba(255,255,255,0.1)', 
                          borderRadius: '0.75rem',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                        formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Net P&L']}
                      />
                      <Bar 
                        dataKey="pnl" 
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  ) : (
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} tickFormatter={(v) => `${v}%`} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0c0f17', 
                          borderColor: 'rgba(255,255,255,0.1)', 
                          borderRadius: '0.75rem',
                          color: '#fff',
                          fontSize: '12px'
                        }} 
                        formatter={(val: any) => [`-${Number(val).toFixed(2)}%`, 'Drawdown']}
                      />
                      <Area type="monotone" dataKey="drawdown" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#ddGradient)" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Right 1 Col: Market Session Edge & Risk Guard */}
        <div className="space-y-6">
          
          {/* Market Session Performance */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.05]">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Session Profitability</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">EDGE ANALYSIS</span>
            </div>

            <div className="space-y-3">
              {/* London */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-semibold text-white">London Session</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">15:00 - 23:00 WIB</span>
                </div>
                <div className="text-right font-mono">
                  <span className={`text-xs font-bold ${sessionStats.london.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {sessionStats.london.pnl >= 0 ? '+' : ''}${sessionStats.london.pnl.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{sessionStats.london.trades} Trades</span>
                </div>
              </div>

              {/* New York */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-semibold text-white">New York Session</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">20:00 - 04:00 WIB</span>
                </div>
                <div className="text-right font-mono">
                  <span className={`text-xs font-bold ${sessionStats.ny.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {sessionStats.ny.pnl >= 0 ? '+' : ''}${sessionStats.ny.pnl.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{sessionStats.ny.trades} Trades</span>
                </div>
              </div>

              {/* Tokyo / Asian */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    <span className="text-xs font-semibold text-white">Asian / Tokyo Session</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">07:00 - 15:00 WIB</span>
                </div>
                <div className="text-right font-mono">
                  <span className={`text-xs font-bold ${sessionStats.asian.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {sessionStats.asian.pnl >= 0 ? '+' : ''}${sessionStats.asian.pnl.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{sessionStats.asian.trades} Trades</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Risk Guard & Discipline Card */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.05]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Trader Risk Guard</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Account Discipline:</span>
                <span className="font-mono font-bold text-amber-300">{disciplineScore} / 100</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Max Daily DD Limit:</span>
                <span className="font-mono text-slate-200">5.0% ($500.00)</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Position Sizing Status:</span>
                <span className="font-mono text-emerald-400">Optimal (1.0% Risk)</span>
              </div>
            </div>
          </Card>

        </div>

      </div>

      {/* Recent Executions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white font-sans">Recent Executions</h2>
          </div>
          <Link 
            to="/journal" 
            className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1 font-medium"
          >
            View Full Ledger <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {trades.length === 0 ? (
          <EmptyState 
            title="Tidak Ada Transaksi Terbaru" 
            description="Eksekusi transaksi di MT5 atau input manual untuk mulai mencatat riwayat trade."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trades.slice(-6).reverse().map((trade) => {
              const netPnL = getTradeNetPnL(trade);
              const isWin = isTradeWin(trade);
              const isLoss = isTradeLoss(trade);
              const tradeDate = getTradeDate(trade);
              const lot = getTradeLot(trade);

              return (
                <div 
                  key={trade.id}
                  onClick={() => setSelectedTrade(trade)}
                  className="p-4 rounded-xl bg-[#0c0f17]/90 border border-white/[0.06] hover:border-amber-500/30 hover:bg-[#121622] transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                          {trade.pair}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          trade.direction === 'Long' || trade.direction === 'Buy'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {trade.direction?.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {lot} Lots
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{tradeDate ? new Date(tradeDate).toLocaleDateString() : '-'}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-mono font-bold text-sm flex items-center justify-end gap-0.5 ${
                        isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {isWin ? <ArrowUpRight className="w-3.5 h-3.5" /> : isLoss ? <ArrowDownRight className="w-3.5 h-3.5" /> : null}
                        {netPnL >= 0 ? '+' : ''}${netPnL.toFixed(2)}
                      </div>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded inline-block mt-0.5 ${
                        isWin ? 'bg-emerald-500/10 text-emerald-400' : isLoss ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-700/30 text-slate-400'
                      }`}>
                        {trade.result || (isWin ? 'Win' : isLoss ? 'Loss' : 'BE')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Entry: {trade.entry_price || '-'}</span>
                    <span>Exit: {trade.exit_price || '-'}</span>
                    <span>R:R {trade.rr_realized ? `1:${trade.rr_realized}` : '-'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trade Details Modal */}
      <TradeDetailsModal 
        isOpen={!!selectedTrade}
        trade={selectedTrade}
        onClose={() => setSelectedTrade(null)}
      />

      {/* Position Calculator Modal */}
      <PositionCalculatorModal 
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        defaultBalance={currentBalance}
      />

    </div>
  );
};

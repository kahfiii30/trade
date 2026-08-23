import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Trade } from '../types/database';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../contexts/ToastContext';
import { 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  ArrowUpDown, 
  Plus, 
  LayoutGrid, 
  Table as TableIcon,
  ArrowUpRight, 
  ArrowDownRight,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TradeDetailsModal } from '../components/TradeDetailsModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { PORTFOLIO_USER_ID } from '../lib/constants';
import { 
  getTradeDate, 
  getTradeLot, 
  getTradeNetPnL, 
  getTradeGrossPnL,
  getTradeFee,
  isTradeWin, 
  isTradeLoss,
  extractTradeTicket
} from '../utils/tradeUtils';

export const JournalTable = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Custom Luxury Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    tradeId?: string;
    tradePair?: string;
    isAll?: boolean;
    count?: number;
  }>({ isOpen: false });
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'Long' | 'Short'>('ALL');
  const [filterResult, setFilterResult] = useState<'ALL' | 'Win' | 'Loss' | 'BE' | 'Pending'>('ALL');
  const [sortField, setSortField] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const targetUserId = user?.id || PORTFOLIO_USER_ID;

  const fetchTrades = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', targetUserId)
        .order('date', { ascending: false });

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrades(true);

    // Realtime channel to automatically detect MT5 sync / new inserts
    const channel = supabase
      .channel('journal-trades-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trades' },
        () => {
          fetchTrades(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId]);

  const handlePromptDeleteSingle = (trade: Trade, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal({
      isOpen: true,
      tradeId: trade.id,
      tradePair: trade.pair || 'Transaksi',
      isAll: false,
    });
  };

  const handlePromptDeleteAll = () => {
    if (trades.length === 0) return;
    setDeleteModal({
      isOpen: true,
      isAll: true,
      count: trades.length,
    });
  };

  const handleExecuteDelete = async () => {
    setIsDeleting(true);
    try {
      if (deleteModal.isAll) {
        // Collect all MT5 tickets/positions to blacklist
        const ticketsToIgnore = trades
          .map(t => extractTradeTicket(t))
          .filter((t): t is string => !!t)
          .map(t => ({
            user_id: targetUserId,
            ticket: t,
            reason: 'Deleted All by user from Web'
          }));

        if (ticketsToIgnore.length > 0) {
          await supabase.from('ignored_tickets').upsert(ticketsToIgnore, { onConflict: 'user_id,ticket' });
        }

        const { error } = await supabase.from('trades').delete().eq('user_id', targetUserId);
        if (error) throw error;
        setTrades([]);
        showToast('Semua transaksi di jurnal berhasil dihapus dan diblacklist dari MT5 sync.');
      } else if (deleteModal.tradeId) {
        // Find deleted trade ticket and add to blacklist
        const targetTrade = trades.find(t => t.id === deleteModal.tradeId);
        const ticket = targetTrade ? extractTradeTicket(targetTrade) : null;

        if (ticket) {
          await supabase.from('ignored_tickets').upsert({
            user_id: targetUserId,
            ticket: ticket,
            reason: `Deleted by user from Web (${targetTrade?.pair || ''})`
          }, { onConflict: 'user_id,ticket' });
        }

        const { error } = await supabase.from('trades').delete().eq('id', deleteModal.tradeId);
        if (error) throw error;
        setTrades(prev => prev.filter(t => t.id !== deleteModal.tradeId));
        showToast(`Transaksi ${deleteModal.tradePair || ''} berhasil dihapus.`);
      }
      setDeleteModal({ isOpen: false });
    } catch (error: any) {
      showToast('Gagal menghapus data: ' + error.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const matchesSearch = 
        trade.pair?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.setup_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDirection = filterDirection === 'ALL' || trade.direction === filterDirection;
      const matchesResult = filterResult === 'ALL' || trade.result === filterResult;

      return matchesSearch && matchesDirection && matchesResult;
    }).sort((a, b) => {
      let aVal: any = a[sortField as keyof Trade];
      let bVal: any = b[sortField as keyof Trade];

      if (sortField === 'date' || sortField === 'close_time') {
        aVal = new Date(getTradeDate(a)).getTime();
        bVal = new Date(getTradeDate(b)).getTime();
      } else if (sortField === 'pnl' || sortField === 'pnl_nominal') {
        aVal = getTradeNetPnL(a);
        bVal = getTradeNetPnL(b);
      } else if (sortField === 'lot' || sortField === 'position_size') {
        aVal = getTradeLot(a);
        bVal = getTradeLot(b);
      }

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc' ? (Number(aVal) > Number(bVal) ? 1 : -1) : (Number(bVal) > Number(aVal) ? 1 : -1);
    });
  }, [trades, searchTerm, filterDirection, filterResult, sortField, sortOrder]);

  // Realtime Filtered Metrics
  const filteredPnL = filteredTrades.reduce((acc, t) => acc + getTradeNetPnL(t), 0);
  const filteredWins = filteredTrades.filter(t => isTradeWin(t)).length;
  const filteredWinRate = filteredTrades.length > 0 ? (filteredWins / filteredTrades.length) * 100 : 0;
  const filteredLots = filteredTrades.reduce((acc, t) => acc + getTradeLot(t), 0);

  // 1-Click Export to CSV
  const handleExportCSV = () => {
    if (filteredTrades.length === 0) {
      showToast('Tidak ada data transaksi untuk diekspor.', 'error');
      return;
    }

    const headers = ['Pair', 'Direction', 'Lot', 'Open Time', 'Date / Close Time', 'Entry Price', 'Exit Price', 'SL', 'TP', 'Gross PnL', 'Fee', 'Net PnL', 'Result', 'RR Realized', 'Notes'];
    
    const rows = filteredTrades.map(t => [
      t.pair,
      t.direction,
      getTradeLot(t),
      t.open_time || '',
      getTradeDate(t),
      t.entry_price || '',
      t.exit_price || '',
      t.stop_loss || '',
      t.take_profit || '',
      getTradeGrossPnL(t),
      getTradeFee(t),
      getTradeNetPnL(t).toFixed(2),
      t.result || '',
      t.rr_realized || '',
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `trade_hitoshi_journal_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export CSV berhasil diunduh!');
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-white/5 rounded-xl w-64"></div>
        <div className="h-96 bg-white/5 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Header */}
      <PageHeader 
        title="Institutional Trade Ledger"
        badge="PRECISION JOURNAL"
        description="Comprehensive historical trade records, execution metrics & algorithmic review."
        action={
          <div className="flex items-center gap-2">
            {trades.length > 0 && (
              <button
                onClick={handlePromptDeleteAll}
                className="glass-button text-xs py-1.5 px-3 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/20 flex items-center gap-1.5"
                title="Hapus Semua Data Jurnal"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Hapus Semua</span>
              </button>
            )}
            <button
              onClick={() => fetchTrades(false)}
              disabled={isRefreshing}
              className="glass-button text-xs py-1.5 px-3 text-slate-300 hover:text-white flex items-center gap-1.5"
              title="Refresh / Sync Data"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="glass-button text-xs py-1.5 px-3 text-slate-300 hover:text-white flex items-center gap-1.5"
              title="Download CSV Spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => navigate('/trades/new')}
              className="glass-button-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Trade</span>
            </button>
          </div>
        }
      />

      {/* Filtered Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#0c0f17]/90 border border-white/[0.06] text-xs font-mono">
        <div>
          <span className="text-slate-400 text-[11px] block">Filtered Net P&L</span>
          <span className={`text-base font-bold ${filteredPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {filteredPnL >= 0 ? '+' : ''}Rp {filteredPnL.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-[11px] block">Filtered Win Rate</span>
          <span className="text-base font-bold text-amber-300">
            {filteredWinRate.toFixed(1)}% <span className="text-[11px] text-slate-400">({filteredWins}/{filteredTrades.length})</span>
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-[11px] block">Total Volume</span>
          <span className="text-base font-bold text-slate-200">
            {filteredLots.toFixed(2)} <span className="text-[11px] text-slate-400">Lots</span>
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-[11px] block">Records Count</span>
          <span className="text-base font-bold text-slate-200">
            {filteredTrades.length} <span className="text-[11px] text-slate-400">Deals</span>
          </span>
        </div>
      </div>

      {/* Controls & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Cari pair, setup, atau tiket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input text-xs pl-8.5 pr-3 py-1.5 w-full rounded-xl"
            />
          </div>

          {/* Direction Filter */}
          <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] text-xs">
            {(['ALL', 'Long', 'Short'] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => setFilterDirection(dir)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  filterDirection === dir 
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {dir === 'ALL' ? 'All Direction' : dir}
              </button>
            ))}
          </div>

          {/* Result Filter */}
          <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] text-xs">
            {(['ALL', 'Win', 'Loss', 'BE', 'Pending'] as const).map((res) => (
              <button
                key={res}
                onClick={() => setFilterResult(res)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  filterResult === res 
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {res === 'ALL' ? 'All Results' : res === 'Pending' ? 'Open / Running' : res}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] self-end sm:self-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'}`}
            title="Table View"
          >
            <TableIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'}`}
            title="Grid Cards View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Ledger Content */}
      {filteredTrades.length === 0 ? (
        <EmptyState 
          title="Tidak Ada Data Transaksi"
          description={searchTerm ? "Tidak ditemukan transaksi yang sesuai dengan filter pencarian." : "Belum ada transaksi di jurnal. Hubungkan MT5 atau klik + Add Trade."}
          action={
            user && (
              <button onClick={() => navigate('/trades/new')} className="glass-button-primary text-xs py-2 px-4">
                + Tambah Trade
              </button>
            )
          }
        />
      ) : viewMode === 'table' ? (
        /* Institutional Table View */
        <div className="rounded-2xl border border-white/[0.06] bg-[#0c0f17]/90 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-white/[0.02] border-b border-white/[0.05] text-slate-400 text-[11px] uppercase tracking-wider font-sans">
                <tr>
                  <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('date')}>
                    <div className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('pair')}>
                    <div className="flex items-center gap-1">Pair <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="py-3 px-4">Direction</th>
                  <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('lot')}>
                    <div className="flex items-center gap-1">Lots <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="py-3 px-4">Entry / Exit</th>
                  <th className="py-3 px-4">R:R</th>
                  <th className="py-3 px-4 text-right cursor-pointer hover:text-white" onClick={() => handleSort('pnl')}>
                    <div className="flex items-center justify-end gap-1">Net P&L <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredTrades.map((trade) => {
                  const netPnL = getTradeNetPnL(trade);
                  const isWin = isTradeWin(trade);
                  const isLoss = isTradeLoss(trade);
                  const tradeDate = getTradeDate(trade);
                  const lot = getTradeLot(trade);

                  return (
                    <tr 
                      key={trade.id}
                      onClick={() => setSelectedTrade(trade)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 text-slate-300">
                        {tradeDate ? new Date(tradeDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3 px-4 font-bold text-white group-hover:text-amber-300 transition-colors">
                        {trade.pair}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          trade.direction === 'Long' || trade.direction === 'Buy'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {trade.direction?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {lot}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {trade.entry_price || '-'} → {trade.exit_price || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {trade.rr_realized ? `1:${trade.rr_realized}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span className={isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'}>
                          {netPnL >= 0 ? '+' : ''}Rp {netPnL.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isWin ? 'bg-emerald-500/10 text-emerald-400' : isLoss ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-700/30 text-slate-400'
                        }`}>
                          {trade.result || (isWin ? 'Win' : isLoss ? 'Loss' : 'BE')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedTrade(trade); }}
                            className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-white/5"
                            title="Detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handlePromptDeleteSingle(trade, e)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cyber Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrades.map((trade) => {
            const netPnL = getTradeNetPnL(trade);
            const isWin = isTradeWin(trade);
            const isLoss = isTradeLoss(trade);
            const tradeDate = getTradeDate(trade);
            const lot = getTradeLot(trade);

            return (
              <div 
                key={trade.id}
                onClick={() => setSelectedTrade(trade)}
                className="p-5 rounded-2xl bg-[#0c0f17]/90 border border-white/[0.06] hover:border-amber-500/30 hover:bg-[#121622] transition-all duration-200 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-bold text-base text-white group-hover:text-amber-300 transition-colors">
                          {trade.pair}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          trade.direction === 'Long' || trade.direction === 'Buy'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {trade.direction?.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 mt-1 block">
                        {tradeDate ? new Date(tradeDate).toLocaleDateString() : '-'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`font-mono font-bold text-base flex items-center justify-end gap-0.5 ${
                        isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {isWin ? <ArrowUpRight className="w-4 h-4" /> : isLoss ? <ArrowDownRight className="w-4 h-4" /> : null}
                        {netPnL >= 0 ? '+' : ''}Rp {netPnL.toFixed(2)}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded inline-block mt-0.5 ${
                        isWin ? 'bg-emerald-500/10 text-emerald-400' : isLoss ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-700/30 text-slate-400'
                      }`}>
                        {trade.result || (isWin ? 'Win' : isLoss ? 'Loss' : 'BE')}
                      </span>
                    </div>
                  </div>

                  {trade.notes && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 font-sans bg-black/20 p-2.5 rounded-lg border border-white/[0.03]">
                      {trade.notes}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Lots: {lot}</span>
                  <span>R:R {trade.rr_realized ? `1:${trade.rr_realized}` : '-'}</span>
                  <button
                    onClick={(e) => handlePromptDeleteSingle(trade, e)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                    title="Hapus Transaksi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Trade Detail Modal */}
      <TradeDetailsModal 
        isOpen={!!selectedTrade}
        trade={selectedTrade}
        onClose={() => setSelectedTrade(null)}
      />

      {/* Luxury Custom Confirm Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => !isDeleting && setDeleteModal({ isOpen: false })}
        onConfirm={handleExecuteDelete}
        isLoading={isDeleting}
        variant="danger"
        title={deleteModal.isAll ? "Hapus Semua Riwayat Jurnal?" : `Hapus Transaksi ${deleteModal.tradePair}?`}
        message={
          deleteModal.isAll 
            ? `Apakah Anda yakin ingin menghapus seluruh ${deleteModal.count || trades.length} transaksi di jurnal ini? Seluruh data histori dan analitik akan direset permanen.`
            : `Transaksi ${deleteModal.tradePair} ini akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan.`
        }
        confirmText={deleteModal.isAll ? "Ya, Hapus Semua" : "Ya, Hapus"}
        cancelText="Batal"
      />

    </div>
  );
};

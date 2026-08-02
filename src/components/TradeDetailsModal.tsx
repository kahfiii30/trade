import React, { useState } from 'react';
import type { Trade } from '../types/database';
import { X, Sparkles, Loader2, ArrowUpRight, ArrowDownRight, Tag, HeartPulse, AlertOctagon } from 'lucide-react';
import { Badge } from './ui/Badge';
import { analyzeTrade } from '../lib/ai';
import { supabase } from '../lib/supabaseClient';

interface TradeDetailsModalProps {
  isOpen?: boolean;
  trade: Trade | null;
  onClose: () => void;
  onTradeUpdated?: (updatedTrade: Trade) => void;
}

export const TradeDetailsModal: React.FC<TradeDetailsModalProps> = ({ isOpen = true, trade, onClose, onTradeUpdated }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !trade) return null;

  const netPnL = Number(trade.pnl || 0) - Number(trade.commission || 0) - Number(trade.swap || 0);
  const isWin = netPnL > 0 || trade.result === 'Win';
  const isLoss = netPnL < 0 || trade.result === 'Loss';
  const lotSize = trade.lot || 0;
  const tradeDate = trade.close_time || trade.open_time || new Date().toISOString();

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const analysis = await analyzeTrade(trade);
      
      const { error: dbError } = await supabase
        .from('trades')
        .update({ ai_analysis: analysis })
        .eq('id', trade.id);

      if (dbError) throw dbError;

      if (onTradeUpdated) {
        onTradeUpdated({ ...trade, ai_analysis: analysis });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze trade.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[#0c0f17] border border-white/[0.08] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl custom-scrollbar">
        
        {/* Modal Header */}
        <div className="sticky top-0 bg-[#0c0f17]/95 backdrop-blur-xl border-b border-white/[0.06] p-5 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border font-bold text-xs ${
              trade.direction === 'Long' || trade.direction === 'Buy'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {trade.direction === 'Long' || trade.direction === 'Buy' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-sans text-white tracking-tight">{trade.pair}</h2>
                <Badge variant={isWin ? 'win' : isLoss ? 'loss' : 'be'}>
                  {trade.result || 'CLOSED'}
                </Badge>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/[0.06]">
                  {lotSize} Lots
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {new Date(tradeDate).toLocaleString()}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Main Key Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Net P&L</span>
              <span className={`text-lg font-bold font-mono ${
                isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-300'
              }`}>
                {netPnL >= 0 ? '+' : ''}${netPnL.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Position Size</span>
              <span className="text-lg font-bold font-mono text-white">
                {lotSize} Lots
              </span>
            </div>
            <div>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Gross PnL / Comm</span>
              <span className="text-sm font-mono text-slate-300 mt-0.5 block">
                ${Number(trade.pnl || 0).toFixed(2)} / ${Number(trade.commission || 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Realized R:R</span>
              <span className="text-lg font-bold font-mono text-amber-300">
                {trade.rr_realized ? `1:${trade.rr_realized}` : '-'}
              </span>
            </div>
          </div>

          {/* Execution Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Price Levels */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 pb-2 border-b border-white/[0.04]">
                <Tag className="w-3.5 h-3.5 text-amber-400" /> Price Levels & Execution
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">ENTRY PRICE</span>
                  <span className="text-white font-bold">{trade.entry_price || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">EXIT PRICE</span>
                  <span className="text-white font-bold">{trade.exit_price || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">STOP LOSS</span>
                  <span className="text-rose-400 font-bold">{trade.stop_loss || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">TAKE PROFIT</span>
                  <span className="text-emerald-400 font-bold">{trade.take_profit || '-'}</span>
                </div>
              </div>
            </div>

            {/* Psychology & Context */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 pb-2 border-b border-white/[0.04]">
                <HeartPulse className="w-3.5 h-3.5 text-indigo-400" /> Psychology & Tags
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">EMOTION STATE</span>
                  <span className="text-indigo-300 font-medium">{trade.emotion || 'Disciplined & Calm'}</span>
                </div>
                {trade.mistakes && trade.mistakes.length > 0 && (
                  <div>
                    <span className="text-slate-400 block text-[10px] mb-1 flex items-center gap-1 text-rose-400">
                      <AlertOctagon className="w-3 h-3" /> MISTAKES RECORDED
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {trade.mistakes.map((m, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px] font-mono">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {trade.notes && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Trade Notes & Audit Log</span>
              <p className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                {trade.notes}
              </p>
            </div>
          )}

          {/* AI Trading Coach Analysis */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-500/[0.04] to-transparent border border-amber-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-300 flex items-center justify-center border border-amber-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-sans font-bold text-xs text-white">AI Mentor Audit</h3>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="glass-button text-xs py-1 px-3 text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" /> {trade.ai_analysis ? 'Re-Analyze' : 'Generate AI Review'}
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 mb-3 font-mono">
                {error}
              </div>
            )}

            {trade.ai_analysis ? (
              <div className="text-xs text-slate-200 leading-relaxed font-sans bg-black/30 p-3.5 rounded-xl border border-white/[0.04] whitespace-pre-wrap">
                {trade.ai_analysis}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Klik &apos;Generate AI Review&apos; untuk mendapatkan analisis psikologi, kepatuhan rule, dan rekomendasi perbaikan trading dari AI.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

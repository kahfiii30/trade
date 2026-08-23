import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import type { Trade } from '../types/database';
import { ArrowLeft, Calculator, Target, Activity, HeartPulse, Save } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { PORTFOLIO_USER_ID } from '../lib/constants';

export const TradeFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(!!id);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Trade>>({
    date: new Date().toISOString().slice(0, 16),
    pair: '',
    market: 'Forex',
    direction: 'Long',
    timeframe: '15m',
    setup_tags: [],
    entry_price: 0,
    stop_loss: 0,
    take_profit: 0,
    exit_price: 0,
    position_size: 0.1,
    risk_percent: 1,
    fee: 0,
    result: 'Pending',
    rr_planned: 0,
    rr_realized: 0,
    pnl_nominal: 0,
    emotion: 'Disciplined',
    mistakes: [],
    screenshot_before: '',
    screenshot_after: '',
    notes: ''
  });

  const targetUserId = user?.id || PORTFOLIO_USER_ID;

  useEffect(() => {
    if (id) {
      const fetchTrade = async () => {
        try {
          const { data, error } = await supabase
            .from('trades')
            .select('*')
            .eq('id', id)
            .single();
            
          if (error) throw error;
          if (data) {
            const rawDate = data.date || data.close_time || data.open_time || new Date().toISOString();
            const dateObj = new Date(rawDate);
            const formattedDate = !isNaN(dateObj.getTime())
              ? new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
              : new Date().toISOString().slice(0, 16);
            
            setFormData({
              ...data,
              date: formattedDate,
              position_size: data.position_size !== undefined && data.position_size !== null ? data.position_size : (data.lot || 0.1),
              pnl_nominal: data.pnl_nominal !== undefined && data.pnl_nominal !== null ? data.pnl_nominal : (data.pnl || 0),
              fee: data.fee !== undefined && data.fee !== null ? data.fee : (Number(data.commission || 0) + Number(data.swap || 0))
            });
          }
        } catch (error) {
          console.error('Error fetching trade:', error);
        } finally {
          setIsFetching(false);
        }
      };
      fetchTrade();
    }
  }, [id, targetUserId]);

  const calculateMetrics = () => {
    let { entry_price, stop_loss, take_profit, exit_price, position_size, fee, direction } = formData;
    
    entry_price = Number(entry_price) || 0;
    stop_loss = Number(stop_loss) || 0;
    take_profit = Number(take_profit) || 0;
    exit_price = Number(exit_price) || 0;
    position_size = Number(position_size) || 0;
    fee = Number(fee) || 0;

    if (entry_price === 0) return;

    // Planned RR Calculation
    let risk = Math.abs(entry_price - stop_loss);
    let reward = Math.abs(take_profit - entry_price);
    let rr_planned = risk > 0 ? reward / risk : 0;

    // Realized Calculations
    let rr_realized = 0;
    let pnl_nominal = 0;
    
    if (exit_price > 0) {
      let realizedReward = 0;
      if (direction === 'Long') {
        realizedReward = exit_price - entry_price;
        pnl_nominal = (realizedReward * position_size) - fee;
      } else {
        realizedReward = entry_price - exit_price;
        pnl_nominal = (realizedReward * position_size) - fee;
      }
      
      rr_realized = risk > 0 ? realizedReward / risk : 0;
    }

    setFormData(prev => ({
      ...prev,
      rr_planned: Number(rr_planned.toFixed(2)),
      rr_realized: Number(rr_realized.toFixed(2)),
      pnl_nominal: Number(pnl_nominal.toFixed(2)),
      result: exit_price > 0 
        ? (pnl_nominal > 0 ? 'Win' : pnl_nominal < 0 ? 'Loss' : 'BE')
        : prev.result
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) {
      showToast('User identification missing. Please sign in.', 'error');
      return;
    }
    setIsLoading(true);

    try {
      // Calculate latest metrics before submission
      let entry_price = Number(formData.entry_price) || 0;
      let stop_loss = Number(formData.stop_loss) || 0;
      let take_profit = Number(formData.take_profit) || 0;
      let exit_price = Number(formData.exit_price) || 0;
      let position_size = Number(formData.position_size) || 0;
      let fee = Number(formData.fee) || 0;
      let direction = formData.direction || 'Long';

      let risk = Math.abs(entry_price - stop_loss);
      let reward = Math.abs(take_profit - entry_price);
      let rr_planned = risk > 0 ? reward / risk : (formData.rr_planned || 0);

      let rr_realized = formData.rr_realized || 0;
      let pnl_nominal = formData.pnl_nominal || 0;
      let result = formData.result || 'Pending';

      if (exit_price > 0 && entry_price > 0) {
        let realizedReward = direction === 'Long' ? (exit_price - entry_price) : (entry_price - exit_price);
        pnl_nominal = (realizedReward * position_size) - fee;
        rr_realized = risk > 0 ? realizedReward / risk : 0;
        result = pnl_nominal > 0 ? 'Win' : pnl_nominal < 0 ? 'Loss' : 'BE';
      }

      const isoDate = formData.date ? new Date(formData.date).toISOString() : new Date().toISOString();

      const payload = {
        ...formData,
        user_id: targetUserId,
        date: isoDate,
        close_time: isoDate,
        open_time: isoDate,
        pnl: Number(pnl_nominal.toFixed(2)),
        pnl_nominal: Number(pnl_nominal.toFixed(2)),
        lot: position_size,
        position_size: position_size,
        fee: fee,
        commission: fee,
        rr_planned: Number(rr_planned.toFixed(2)),
        rr_realized: Number(rr_realized.toFixed(2)),
        result: result
      };

      if (id) {
        const { error } = await supabase.from('trades').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('trades').insert([payload]);
        if (error) throw error;
      }
      
      showToast(id ? 'Trade updated successfully!' : 'Trade saved successfully!', 'success');
      navigate('/journal');
    } catch (error) {
      console.error('Error saving trade:', error);
      showToast('Failed to save trade. Check console for details.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) return <div className="animate-pulse h-96 bg-white/5 rounded-2xl"></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2.5 bg-[#0a0f1d] border border-white/[0.08] rounded-xl text-slate-400 hover:text-white hover:border-cyan-500/40 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PageHeader 
          title={id ? 'Edit Trade Record' : 'Manual Trade Ticket'} 
          badge={id ? 'UPDATE' : 'NEW EXECUTION'}
          description="Log execution details, risk parameters, and psychological notes." 
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-8">
          
          {/* Asset & Order Details */}
          <div>
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 mb-5">
              <Activity className="w-4 h-4 text-accent-cyan" />
              <h3 className="text-sm font-bold font-brand text-white uppercase tracking-wider">
                Asset & Order Parameters
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Date & Time</label>
                <input 
                  type="datetime-local" 
                  name="date" 
                  value={formData.date || ''} 
                  onChange={handleChange} 
                  required 
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Pair / Symbol</label>
                <input 
                  type="text" 
                  placeholder="e.g. XAUUSD, EURUSD" 
                  name="pair" 
                  value={formData.pair} 
                  onChange={handleChange} 
                  required 
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 uppercase font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Market Category</label>
                <select 
                  name="market" 
                  value={formData.market} 
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                >
                  <option value="Forex" className="bg-[#0a0f1d]">Forex</option>
                  <option value="Crypto" className="bg-[#0a0f1d]">Crypto</option>
                  <option value="Indices" className="bg-[#0a0f1d]">Indices</option>
                  <option value="Commodities" className="bg-[#0a0f1d]">Commodities</option>
                  <option value="Stocks" className="bg-[#0a0f1d]">Stocks</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Order Direction</label>
                <select 
                  name="direction" 
                  value={formData.direction} 
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer font-bold"
                >
                  <option value="Long" className="bg-[#0a0f1d] text-accent-emerald">Long (Buy)</option>
                  <option value="Short" className="bg-[#0a0f1d] text-accent-rose">Short (Sell)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Timeframe</label>
                <select 
                  name="timeframe" 
                  value={formData.timeframe} 
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                >
                  <option value="1m" className="bg-[#0a0f1d]">1m</option>
                  <option value="5m" className="bg-[#0a0f1d]">5m</option>
                  <option value="15m" className="bg-[#0a0f1d]">15m</option>
                  <option value="1H" className="bg-[#0a0f1d]">1H</option>
                  <option value="4H" className="bg-[#0a0f1d]">4H</option>
                  <option value="Daily" className="bg-[#0a0f1d]">Daily</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Volume (Lots)</label>
                <input 
                  type="number" 
                  step="any" 
                  name="position_size" 
                  value={formData.position_size || ''} 
                  onChange={handleChange} 
                  required 
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>
          </div>

          {/* Price Levels & Realtime Calculator */}
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-5">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-accent-gold" />
                <h3 className="text-sm font-bold font-brand text-white uppercase tracking-wider">
                  Price Levels & Live Math
                </h3>
              </div>
              <button 
                type="button" 
                onClick={calculateMetrics}
                className="glass-button text-[11px] py-1 px-2.5 text-accent-cyan border-cyan-500/30 hover:bg-cyan-500/15"
              >
                <Calculator className="w-3 h-3" /> Auto Recalculate
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Entry Price</label>
                <input 
                  type="number" 
                  step="any" 
                  name="entry_price" 
                  value={formData.entry_price || ''} 
                  onChange={handleChange} 
                  required 
                  placeholder="0.00"
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-rose-400 block mb-1.5">Stop Loss</label>
                <input 
                  type="number" 
                  step="any" 
                  name="stop_loss" 
                  value={formData.stop_loss || ''} 
                  onChange={handleChange} 
                  required 
                  placeholder="0.00"
                  className="w-full bg-black/40 border border-rose-500/30 rounded-xl px-3.5 py-2 text-xs font-mono text-rose-300 focus:outline-none focus:border-rose-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1.5">Take Profit</label>
                <input 
                  type="number" 
                  step="any" 
                  name="take_profit" 
                  value={formData.take_profit || ''} 
                  onChange={handleChange} 
                  required 
                  placeholder="0.00"
                  className="w-full bg-black/40 border border-emerald-500/30 rounded-xl px-3.5 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Exit Price</label>
                <input 
                  type="number" 
                  step="any" 
                  name="exit_price" 
                  value={formData.exit_price || ''} 
                  onChange={handleChange} 
                  placeholder="0.00"
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            {/* Live Computed Metrics Box */}
            <div className="grid grid-cols-3 gap-4 mt-5 p-4 rounded-xl bg-black/50 border border-cyan-500/20">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Planned R:R</span>
                <span className="text-base font-bold font-mono text-cyan-300">1:{formData.rr_planned || 0}</span>
              </div>
              <div className="border-l border-white/[0.08] pl-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Realized R:R</span>
                <span className="text-base font-bold font-mono text-white">1:{formData.rr_realized || 0}</span>
              </div>
              <div className="border-l border-white/[0.08] pl-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Calculated Net P&L</span>
                <span className={`text-base font-extrabold font-mono ${
                  Number(formData.pnl_nominal) > 0 ? 'text-accent-emerald' : Number(formData.pnl_nominal) < 0 ? 'text-accent-rose' : 'text-slate-300'
                }`}>
                  {Number(formData.pnl_nominal) > 0 ? '+' : ''}Rp {formData.pnl_nominal || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Psychology & Notes */}
          <div>
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 mb-5">
              <HeartPulse className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold font-brand text-white uppercase tracking-wider">
                Psychology & Execution Audit
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Trade Emotional State</label>
                <select 
                  name="emotion" 
                  value={formData.emotion} 
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-purple-300 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                >
                  <option value="Disciplined" className="bg-[#0a0f1d]">Disciplined & Patient</option>
                  <option value="FOMO" className="bg-[#0a0f1d]">FOMO (Fear of Missing Out)</option>
                  <option value="Anxious" className="bg-[#0a0f1d]">Anxious / Hesitant</option>
                  <option value="Overconfident" className="bg-[#0a0f1d]">Overconfident</option>
                  <option value="Revenge" className="bg-[#0a0f1d]">Revenge Trading</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Result Status</label>
                <select 
                  name="result" 
                  value={formData.result} 
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer font-bold"
                >
                  <option value="Pending" className="bg-[#0a0f1d] text-slate-400">Pending</option>
                  <option value="Win" className="bg-[#0a0f1d] text-accent-emerald">Win</option>
                  <option value="Loss" className="bg-[#0a0f1d] text-accent-rose">Loss</option>
                  <option value="BE" className="bg-[#0a0f1d] text-slate-300">Break Even</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Trade Analysis & Execution Notes</label>
              <textarea 
                rows={4} 
                name="notes" 
                value={formData.notes || ''} 
                onChange={handleChange}
                placeholder="Log why you took this trade, market context, confluence, and self-review..."
                className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="glass-button text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="glass-button-primary text-xs py-2 px-5 font-bold flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> {isLoading ? 'Saving...' : 'Save Trade Ticket'}
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
};

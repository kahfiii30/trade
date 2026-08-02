import { useState, useId } from 'react';
import { X, Calculator, ShieldCheck, Copy, Check, Info } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface PositionCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBalance?: number;
}

export const PositionCalculatorModal = ({ 
  isOpen, 
  onClose,
  defaultBalance = 10000 
}: PositionCalculatorModalProps) => {
  const { showToast } = useToast();
  const [balance, setBalance] = useState<number>(defaultBalance);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [assetType, setAssetType] = useState<'forex' | 'gold' | 'indices' | 'crypto'>('gold');
  const [stopLossPips, setStopLossPips] = useState<number>(25);
  const [plannedRR, setPlannedRR] = useState<number>(2);
  const [copied, setCopied] = useState(false);

  const balanceInputId = useId();
  const riskPercentInputId = useId();
  const assetTypeInputId = useId();
  const slPipsInputId = useId();
  const rrInputId = useId();

  if (!isOpen) return null;

  // Calculation Logic
  const riskAmount = (balance * riskPercent) / 100;
  
  let calculatedLot = 0;
  let pipValuePerLot = 10; // Standard Forex 1 Lot = $10/pip

  if (assetType === 'forex') {
    // 1 Pip = 0.0001 (or 0.01 on JPY), 1 Standard Lot = $10 per pip
    pipValuePerLot = 10;
    calculatedLot = stopLossPips > 0 ? riskAmount / (stopLossPips * pipValuePerLot) : 0;
  } else if (assetType === 'gold') {
    // XAUUSD: 1 Pip (0.10 move) on 1.00 Lot = $10 (100 oz contract)
    // 1 Point (0.01 move) = $1
    pipValuePerLot = 10;
    calculatedLot = stopLossPips > 0 ? riskAmount / (stopLossPips * pipValuePerLot) : 0;
  } else if (assetType === 'indices') {
    // US30/NAS100: standard contract approx $1 per point per lot
    pipValuePerLot = 1;
    calculatedLot = stopLossPips > 0 ? riskAmount / (stopLossPips * pipValuePerLot) : 0;
  } else if (assetType === 'crypto') {
    // Crypto BTC/ETH: 1 Lot = 1 Coin contract
    pipValuePerLot = 1;
    calculatedLot = stopLossPips > 0 ? riskAmount / stopLossPips : 0;
  }

  // Format lot to 2 decimal places (standard broker minimum step 0.01)
  const finalLot = Math.max(0.01, Math.round(calculatedLot * 100) / 100);
  const potentialProfit = riskAmount * plannedRR;

  const handleCopyLot = () => {
    navigator.clipboard.writeText(finalLot.toFixed(2));
    setCopied(true);
    showToast(`Lot size ${finalLot.toFixed(2)} berhasil disalin!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0c0f17] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-sans">Position & Lot Size Calculator</h2>
              <p className="text-[11px] text-slate-400">Hitung ukuran lot presisi sebelum eksekusi order MT5</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Main Calculated Result Banner */}
          <div className="p-5 rounded-xl bg-gradient-to-b from-amber-500/[0.08] to-transparent border border-amber-500/20 text-center relative">
            <span className="text-[11px] font-mono font-semibold uppercase text-amber-400/90 tracking-wider">
              Recommended Position Size
            </span>
            <div className="flex items-center justify-center gap-3 my-2">
              <span className="text-4xl sm:text-5xl font-mono font-extrabold text-white tracking-tight">
                {finalLot.toFixed(2)}
              </span>
              <span className="text-xs font-mono px-2 py-1 rounded bg-white/[0.05] text-amber-300 border border-amber-500/30">
                LOTS
              </span>
            </div>
            
            <button 
              onClick={handleCopyLot}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-white/[0.04] text-slate-300 hover:text-white border border-white/[0.08] hover:border-amber-500/30 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin ke Clipboard' : 'Copy Lot untuk MT5'}
            </button>
          </div>

          {/* Input Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={balanceInputId} className="text-xs font-medium text-slate-400 block mb-1.5">
                Account Balance ($)
              </label>
              <input 
                id={balanceInputId}
                type="number" 
                value={balance} 
                onChange={(e) => setBalance(Number(e.target.value))}
                className="glass-input w-full font-mono text-sm"
              />
            </div>
            <div>
              <label htmlFor={riskPercentInputId} className="text-xs font-medium text-slate-400 block mb-1.5">
                Risk Per Trade (%)
              </label>
              <div className="flex items-center gap-1.5">
                {[0.5, 1, 2, 3].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setRiskPercent(pct)}
                    className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all ${
                      riskPercent === pct 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                        : 'bg-white/[0.02] text-slate-400 border-white/[0.06] hover:bg-white/[0.05]'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor={assetTypeInputId} className="text-xs font-medium text-slate-400 block mb-1.5">
                Instrument
              </label>
              <select 
                id={assetTypeInputId}
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as any)}
                className="glass-input w-full text-xs font-sans"
              >
                <option value="gold" className="bg-[#0c0f17]">Gold (XAUUSD)</option>
                <option value="forex" className="bg-[#0c0f17]">Forex (Majors)</option>
                <option value="indices" className="bg-[#0c0f17]">Indices (US30/NAS)</option>
                <option value="crypto" className="bg-[#0c0f17]">Crypto (BTC/ETH)</option>
              </select>
            </div>

            <div>
              <label htmlFor={slPipsInputId} className="text-xs font-medium text-slate-400 block mb-1.5">
                Stop Loss (Pips/Pts)
              </label>
              <input 
                id={slPipsInputId}
                type="number" 
                value={stopLossPips} 
                onChange={(e) => setStopLossPips(Math.max(1, Number(e.target.value)))}
                className="glass-input w-full font-mono text-xs"
              />
            </div>

            <div>
              <label htmlFor={rrInputId} className="text-xs font-medium text-slate-400 block mb-1.5">
                Target R:R (1:X)
              </label>
              <input 
                id={rrInputId}
                type="number" 
                step="0.5"
                value={plannedRR} 
                onChange={(e) => setPlannedRR(Math.max(0.5, Number(e.target.value)))}
                className="glass-input w-full font-mono text-xs"
              />
            </div>
          </div>

          {/* Risk Metrics Breakdown */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-mono">
            <div>
              <span className="text-slate-400 text-[11px] block">Total Risk ($ at SL)</span>
              <span className="text-rose-400 font-bold text-sm">
                -${riskAmount.toFixed(2)} ({riskPercent}%)
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Target Profit ($ at TP)</span>
              <span className="text-emerald-400 font-bold text-sm">
                +${potentialProfit.toFixed(2)} (1:{plannedRR} R:R)
              </span>
            </div>
          </div>

          {riskPercent > 2 && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/[0.07] border border-amber-500/20 text-[11px] text-amber-300/90">
              <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>Resiko di atas 2% per trade tergolong agresif. Disarankan maksimum 1-2% untuk menjaga ketahanan drawdown akun.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.06] bg-white/[0.01] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Risk Guard Active</span>
          </div>
          <button
            onClick={onClose}
            className="glass-button text-xs py-1.5 px-4"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

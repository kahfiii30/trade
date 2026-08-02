import { useState, useEffect } from 'react';
import { Menu, Clock, Calculator, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { PositionCalculatorModal } from '../PositionCalculatorModal';

interface TopbarProps {
  onMenuClick: () => void;
}

export const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { user } = useAuth();
  const [time, setTime] = useState<string>('');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="h-14 border-b border-white/[0.05] bg-[#090b11]/80 backdrop-blur-xl sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
        {/* Mobile Brand / Toggle */}
        <div className="flex items-center gap-3 md:hidden">
          <button 
            onClick={onMenuClick}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-sans font-bold text-sm tracking-tight text-white">TRADE <span className="text-amber-300">HITOSHI</span></span>
        </div>

        {/* Desktop Market Sessions & Clock */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-slate-200 font-semibold">{time || '00:00:00 UTC'}</span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span className="text-slate-400">Market Sessions:</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300 font-medium">London</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300 font-medium">New York</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
              <span className="text-slate-400 font-medium">Tokyo</span>
            </span>
          </div>
        </div>

        {/* Right Action Bar: Calculator & New Trade */}
        <div className="flex items-center gap-2.5">
          {/* Position & Lot Size Calculator Trigger */}
          <button
            onClick={() => setIsCalculatorOpen(true)}
            className="glass-button text-xs py-1.5 px-3 text-slate-300 hover:text-amber-300 hover:border-amber-500/30 flex items-center gap-1.5"
            title="Kalkulator Lot & Risk Management"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Lot Calculator</span>
          </button>

          {user ? (
            <Link
              to="/trades/new"
              className="glass-button-primary text-xs py-1.5 px-3.5 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Trade</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="glass-button text-xs py-1.5 px-3.5 text-slate-200 hover:text-white"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Position & Lot Size Calculator Modal */}
      <PositionCalculatorModal 
        isOpen={isCalculatorOpen} 
        onClose={() => setIsCalculatorOpen(false)} 
      />
    </>
  );
};

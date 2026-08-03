import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, Info, CheckCircle2, X, Loader2 } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'danger',
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 className="w-5 h-5 text-rose-400" />,
          iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-500/20',
          confirmButton: 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 border border-rose-400/30',
          badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
          badgeText: 'PERINGATAN HAPUS',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-amber-500/20',
          confirmButton: 'bg-amber-500 hover:bg-amber-400 text-black font-semibold shadow-lg shadow-amber-500/25 border border-amber-400/30',
          badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
          badgeText: 'PERHATIAN',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/20',
          confirmButton: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/30',
          badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
          badgeText: 'KONFIRMASI',
        };
      default:
        return {
          icon: <Info className="w-5 h-5 text-cyan-400" />,
          iconBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 shadow-cyan-500/20',
          confirmButton: 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/30',
          badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
          badgeText: 'INFORMASI',
        };
    }
  };

  const currentStyles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="fixed inset-0"
        onClick={() => !isLoading && onClose()}
      />
      
      <div className="relative w-full max-w-md bg-[#0c0f17] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Glow accent */}
        <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
          variant === 'danger' ? 'bg-rose-500' : variant === 'warning' ? 'bg-amber-500' : 'bg-cyan-500'
        }`} />

        {/* Top Header */}
        <div className="flex items-center justify-between p-5 pb-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-inner ${currentStyles.iconBg}`}>
              {currentStyles.icon}
            </div>
            <div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${currentStyles.badge}`}>
                {currentStyles.badgeText}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 pt-3 space-y-2 relative z-10">
          <h3 className="text-base font-bold text-white font-sans tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-4 px-5 bg-white/[0.02] border-t border-white/[0.05] flex items-center justify-end gap-2.5 relative z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-xl border border-white/[0.06] transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${currentStyles.confirmButton} disabled:opacity-50`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

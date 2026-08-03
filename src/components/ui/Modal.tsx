import { useEffect } from 'react';
import type { HTMLAttributes } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const Modal = ({ isOpen, onClose, title, children, className, ...props }: ModalProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      <div 
        className={cn(
          'relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#0c0f17] border border-white/[0.08] rounded-2xl p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 custom-scrollbar',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
          {title && <h2 className="text-base font-bold text-white font-sans">{title}</h2>}
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

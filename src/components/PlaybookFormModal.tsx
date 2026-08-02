import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { Playbook } from '../types/database';

interface PlaybookFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  playbookToEdit?: Playbook | null;
  onSaved: (playbook: Playbook) => void;
}

export const PlaybookFormModal: React.FC<PlaybookFormModalProps> = ({ isOpen, onClose, playbookToEdit, onSaved }) => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    setup_name: '',
    main_timeframe: '1H',
    rule_entry: '',
    rule_invalidation: '',
    is_active: true,
  });

  useEffect(() => {
    if (playbookToEdit) {
      setFormData({
        setup_name: playbookToEdit.setup_name,
        main_timeframe: playbookToEdit.main_timeframe,
        rule_entry: playbookToEdit.rule_entry,
        rule_invalidation: playbookToEdit.rule_invalidation,
        is_active: playbookToEdit.is_active,
      });
    } else {
      setFormData({
        setup_name: '',
        main_timeframe: '1H',
        rule_entry: '',
        rule_invalidation: '',
        is_active: true,
      });
    }
  }, [playbookToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    setError(null);

    try {
      const playbookData = {
        ...formData,
        user_id: user.id,
      };

      let result;
      if (playbookToEdit) {
        const { data, error: updateError } = await supabase
          .from('playbooks')
          .update(playbookData)
          .eq('id', playbookToEdit.id)
          .select()
          .single();
        if (updateError) throw updateError;
        result = data;
      } else {
        const { data, error: insertError } = await supabase
          .from('playbooks')
          .insert([playbookData])
          .select()
          .single();
        if (insertError) throw insertError;
        result = data;
      }

      onSaved(result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save playbook.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative bg-[#0c0f17] border border-white/[0.08] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
        <div className="sticky top-0 bg-[#0c0f17]/95 backdrop-blur-xl border-b border-white/[0.06] p-4.5 flex justify-between items-center z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-sans">
                {playbookToEdit ? 'Edit Strategy Playbook' : 'New Strategy Protocol'}
              </h2>
              <p className="text-[11px] text-slate-400">Formalize your entry checklist & invalidation rules</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3 bg-rose-500/10 text-rose-300 rounded-xl text-xs border border-rose-500/20 font-mono">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Strategy / Setup Name</label>
              <input
                required
                type="text"
                name="setup_name"
                value={formData.setup_name}
                onChange={handleChange}
                placeholder="e.g. SMC Orderblock + FVG"
                className="glass-input w-full text-sm font-sans"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Primary Timeframe</label>
              <select
                name="main_timeframe"
                value={formData.main_timeframe}
                onChange={handleChange}
                className="glass-input w-full text-sm font-sans"
              >
                <option value="1M" className="bg-[#0c0f17]">1 Minute</option>
                <option value="5M" className="bg-[#0c0f17]">5 Minute</option>
                <option value="15M" className="bg-[#0c0f17]">15 Minute</option>
                <option value="1H" className="bg-[#0c0f17]">1 Hour</option>
                <option value="4H" className="bg-[#0c0f17]">4 Hour</option>
                <option value="1D" className="bg-[#0c0f17]">1 Day</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">Entry Rules & Checklist</label>
            <textarea
              required
              name="rule_entry"
              value={formData.rule_entry}
              onChange={handleChange}
              rows={3}
              placeholder="1. Liquidity sweep on previous high&#10;2. MSS (Market Structure Shift) on 5M&#10;3. Tap into 15M Fair Value Gap"
              className="glass-input w-full text-xs font-mono resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-rose-300 block mb-1.5">Invalidation & Cut-Loss Condition</label>
            <textarea
              required
              name="rule_invalidation"
              value={formData.rule_invalidation}
              onChange={handleChange}
              rows={3}
              placeholder="1. Candle closes beyond the invalidation level&#10;2. Unexpected high-impact CPI / NFP news release"
              className="glass-input w-full text-xs font-mono resize-none leading-relaxed border-rose-500/20 focus:border-rose-500/50"
            />
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-4 h-4 rounded border-white/20 bg-[#0c0f17] text-amber-500 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="is_active" className="text-xs text-slate-300 cursor-pointer">
              Active Strategy Protocol
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-2.5 border-t border-white/[0.06]">
            <button 
              type="button" 
              onClick={onClose}
              className="glass-button text-xs py-1.5 px-4"
            >
              Batal
            </button>
            <button 
              type="submit" 
              className="glass-button-primary text-xs py-1.5 px-4 flex items-center gap-2" 
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Playbook'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

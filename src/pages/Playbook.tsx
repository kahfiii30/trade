import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabaseClient';
import type { Playbook as PlaybookType } from '../types/database';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { BookOpen, CheckCircle, Plus, Edit2, Trash2, ShieldAlert, Layers } from 'lucide-react';
import { PlaybookFormModal } from '../components/PlaybookFormModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { PORTFOLIO_USER_ID } from '../lib/constants';

export const Playbook = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [playbooks, setPlaybooks] = useState<PlaybookType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playbookToEdit, setPlaybookToEdit] = useState<PlaybookType | null>(null);
  
  // Delete confirm state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    playbook?: PlaybookType;
  }>({ isOpen: false });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaved = (savedPlaybook: PlaybookType) => {
    setPlaybooks(prev => {
      const exists = prev.find(p => p.id === savedPlaybook.id);
      if (exists) {
        return prev.map(p => p.id === savedPlaybook.id ? savedPlaybook : p);
      }
      return [savedPlaybook, ...prev];
    });
  };

  const openNewModal = () => {
    setPlaybookToEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (playbook: PlaybookType) => {
    setPlaybookToEdit(playbook);
    setIsModalOpen(true);
  };

  const promptDeletePlaybook = (playbook: PlaybookType) => {
    setDeleteModal({
      isOpen: true,
      playbook,
    });
  };

  const handleExecuteDelete = async () => {
    if (!deleteModal.playbook) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('playbooks')
        .delete()
        .eq('id', deleteModal.playbook.id);

      if (error) throw error;
      setPlaybooks(prev => prev.filter(p => p.id !== deleteModal.playbook?.id));
      showToast(`Playbook "${deleteModal.playbook.setup_name}" berhasil dihapus.`);
      setDeleteModal({ isOpen: false });
    } catch (err: any) {
      showToast(`Gagal menghapus playbook: ${err.message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const targetUserId = user?.id || PORTFOLIO_USER_ID;
    
    const fetchPlaybooks = async () => {
      try {
        const { data, error } = await supabase
          .from('playbooks')
          .select('*')
          .eq('user_id', targetUserId);
          
        if (error) throw error;
        setPlaybooks(data || []);
      } catch (error) {
        console.error('Error fetching playbooks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaybooks();
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-white/5 rounded-xl w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-white/5 rounded-2xl"></div>
          <div className="h-64 bg-white/5 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <PageHeader 
        title="Execution Playbooks"
        badge="EDGE PROTOCOLS"
        description="Formalized trading systems, entry confirmations, invalidation rules, and execution checklists."
        action={
          user && (
            <button 
              onClick={openNewModal}
              className="glass-button-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Playbook</span>
            </button>
          )
        }
      />

      {playbooks.length === 0 ? (
        <EmptyState 
          icon={<BookOpen className="w-8 h-8 text-amber-300" />}
          title="Belum Ada Strategy Playbook"
          description="Buat playbook untuk mendokumentasikan aturan setup trading Anda (seperti SMC, Breakout, Scalping) agar disiplin eksekusi terjaga."
          action={
            user && (
              <button onClick={openNewModal} className="glass-button text-xs py-1.5 px-3.5 text-amber-300 border-amber-500/30">
                + Buat Playbook Baru
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {playbooks.map((pb) => (
            <Card 
              key={pb.id}
              className="p-6 flex flex-col justify-between border border-white/[0.06] bg-[#0c0f17]/90 hover:border-amber-500/30 transition-all duration-200"
            >
              <div>
                <div className="flex items-start justify-between mb-4 pb-3 border-b border-white/[0.05]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${pb.is_active ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                      <h3 className="font-sans font-bold text-base text-white">{pb.setup_name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/[0.06]">
                        {pb.main_timeframe || '1H'}
                      </span>
                    </div>
                  </div>
                  {user && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => openEditModal(pb)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-white/5 transition-colors"
                        title="Edit Playbook"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => promptDeletePlaybook(pb)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Hapus Playbook"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Rules Section */}
                <div className="space-y-4 mb-6">
                  {pb.rule_entry && (
                    <div>
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Entry Confirmation Protocol
                      </span>
                      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {pb.rule_entry}
                      </div>
                    </div>
                  )}

                  {pb.rule_invalidation && (
                    <div>
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-rose-400 block mb-1.5 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Invalidation & Cut-Loss Condition
                      </span>
                      <div className="p-3.5 rounded-xl bg-rose-500/[0.05] border border-rose-500/20 text-xs font-mono text-rose-300 whitespace-pre-wrap leading-relaxed">
                        {pb.rule_invalidation}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  {pb.is_active ? 'Active Strategy Edge' : 'Archived Setup'}
                </span>
                <span className="px-2 py-0.5 rounded bg-white/[0.03] text-slate-300 border border-white/[0.06]">
                  Verified
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PlaybookFormModal 
        isOpen={isModalOpen}
        playbookToEdit={playbookToEdit}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
      />

      {/* Luxury Confirm Modal for Playbook */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => !isDeleting && setDeleteModal({ isOpen: false })}
        onConfirm={handleExecuteDelete}
        isLoading={isDeleting}
        variant="danger"
        title={`Hapus Playbook "${deleteModal.playbook?.setup_name}"?`}
        message={`Aturan entry dan invalidasi untuk setup ${deleteModal.playbook?.setup_name} akan dihapus secara permanen.`}
        confirmText="Ya, Hapus Playbook"
        cancelText="Batal"
      />
    </div>
  );
};

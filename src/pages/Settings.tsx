import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Settings as SettingsType } from '../types/database';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../contexts/ToastContext';
import { Radio, Shield, Terminal, Save } from 'lucide-react';

export const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Partial<SettingsType>>({
    initial_capital: 10000,
    default_risk: 1,
    default_rr: 2,
    daily_max_trades: 2,
    currency: 'USD'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (!user) return;
    
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') throw error;
        if (data) setSettings(data);
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchSettings();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);

    try {
      const payload = {
        ...settings,
        user_id: user.id
      };

      if (settings.id) {
        const { error } = await supabase.from('settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('settings').insert([payload]).select().single();
        if (error) throw error;
        if (data) setSettings(data);
      }
      
      showToast('Pengaturan berhasil disimpan!', 'success');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      showToast('Gagal menyimpan: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <div className="animate-pulse h-96 bg-white/5 rounded-2xl"></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      <PageHeader 
        title="Terminal Preferences & MT5 Sync" 
        badge="CONFIGURATION"
        description="Configure your risk parameters, portfolio base capital, and local MT5 sync bridge."
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Risk & Account Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-2 pb-3 mb-5 border-b border-white/[0.05]">
            <Shield className="w-4 h-4 text-amber-400" />
            <h3 className="font-sans font-bold text-sm text-white">Risk Parameters & Capital Base</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-2">
                Initial Account Capital ($)
              </label>
              <input
                type="number"
                step="any"
                name="initial_capital"
                value={settings.initial_capital || ''}
                onChange={handleChange}
                required
                className="glass-input w-full font-mono text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-2">
                Base Currency
              </label>
              <select
                name="currency"
                value={settings.currency || 'USD'}
                onChange={handleChange}
                className="glass-input w-full text-sm font-sans"
              >
                <option value="USD" className="bg-[#0c0f17]">USD ($)</option>
                <option value="IDR" className="bg-[#0c0f17]">IDR (Rp)</option>
                <option value="EUR" className="bg-[#0c0f17]">EUR (€)</option>
                <option value="GBP" className="bg-[#0c0f17]">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-2">
                Default Risk per Trade (%)
              </label>
              <input
                type="number"
                step="0.1"
                name="default_risk"
                value={settings.default_risk || ''}
                onChange={handleChange}
                required
                className="glass-input w-full font-mono text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-2">
                Target Risk-to-Reward (1:X)
              </label>
              <input
                type="number"
                step="0.1"
                name="default_rr"
                value={settings.default_rr || ''}
                onChange={handleChange}
                required
                className="glass-input w-full font-mono text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-2">
                Daily Max Executions Limit
              </label>
              <input
                type="number"
                name="daily_max_trades"
                value={settings.daily_max_trades || ''}
                onChange={handleChange}
                required
                className="glass-input w-full font-mono text-sm"
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.05] flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="glass-button-primary text-xs py-2 px-5 font-semibold flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </Card>
      </form>

      {/* MetaTrader 5 Sync Status & Guide */}
      <Card className="p-6 border-amber-500/20 bg-gradient-to-b from-amber-500/[0.03] to-[#0c0f17]">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
            <h3 className="font-sans font-bold text-sm text-white">MetaTrader 5 Bridge Integration</h3>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
            settings.account_login 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
          }`}>
            {settings.account_login ? '● MT5 CONNECTED' : 'READY TO SYNC'}
          </span>
        </div>

        {/* Live MT5 Connected Telemetry */}
        {settings.account_login && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 mb-4 rounded-xl bg-black/40 border border-white/[0.06]">
            <div>
              <span className="text-[10px] text-slate-400 font-mono block">BROKER / SERVER</span>
              <span className="text-xs font-bold text-white font-mono">{settings.server || 'Exness'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-mono block">ACCOUNT LOGIN</span>
              <span className="text-xs font-bold text-amber-300 font-mono">#{settings.account_login}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-mono block">LIVE BALANCE</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">${Number(settings.live_balance || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-mono block">LIVE EQUITY</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">${Number(settings.live_equity || 0).toLocaleString()}</span>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Anda dapat menghubungkan akun MT5 (Demo maupun Real dari broker manapun) ke web dashboard Trade Hitoshi. Semua order dan deal yang sudah tertutup akan disinkronkan secara realtime ke database.
        </p>

        <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2 font-mono text-xs text-slate-300">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <Terminal className="w-4 h-4" /> Mode Menjalankan MT5 Sync:
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400">
            <li><span className="text-amber-300 font-bold">mt5.bat</span>: Sinkronisasi 1x cepat untuk menarik transaksi terbaru saat ini.</li>
            <li><span className="text-emerald-400 font-bold">mt5_live.bat</span>: Sinkronisasi realtime otomatis terus menerus setiap 15 detik (Live Bridge).</li>
          </ol>
        </div>
      </Card>
    </div>
  );
};

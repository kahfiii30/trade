import { useState, useEffect } from 'react';
import { Zap, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        showToast('Registration successful! Please verify your account or sign in.', 'success');
      }
    } catch (error: any) {
      showToast(error.message || 'An error occurred during authentication.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#050811] text-slate-100 p-4">
      {/* Dynamic Background Flares */}
      <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[150px] pointer-events-none" />
      
      {/* Main Auth Container */}
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center mb-8 text-center">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-emerald-400/10 border border-cyan-400/30 shadow-[0_0_25px_rgba(0,229,255,0.25)] mb-4">
            <Zap className="w-7 h-7 text-accent-cyan" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-emerald opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-emerald"></span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 justify-center mb-1">
            <span className="font-brand font-extrabold text-2xl tracking-tight text-white">TRADE</span>
            <span className="font-brand font-extrabold text-2xl tracking-tight text-gradient-cyan">HITOSHI</span>
          </div>
          <p className="text-slate-400 text-xs font-mono">
            NEXT-GEN PRO TRADING TERMINAL
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#0a0f1d]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-7 sm:p-9 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          <div className="mb-6">
            <h2 className="text-xl font-bold font-brand text-white tracking-tight">
              {isLogin ? 'Terminal Access' : 'Create Trader Account'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isLogin ? 'Enter your credentials to access your live HUD' : 'Join the elite analytics platform'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  placeholder="trader@domain.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full glass-button-primary mt-6 py-2.5 font-bold text-xs"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {isLogin ? 'Sign In to Terminal' : 'Initialize Account'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/[0.06] text-center text-xs text-slate-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-bold text-accent-cyan hover:underline transition-colors ml-1"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
        
        <div className="mt-6 flex items-center justify-center gap-1 text-[11px] font-mono text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-accent-emerald" />
          <span>Encrypted Supabase PostgreSQL connection</span>
        </div>
      </div>
    </div>
  );
};

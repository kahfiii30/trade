import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  ListPlus, 
  TableProperties, 
  BarChart3, 
  CalendarDays, 
  BookOpen, 
  Settings, 
  LogOut, 
  X,
  Radio,
  Shield,
  Layers
} from 'lucide-react';
import { cn } from '../../utils/cn';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', badge: 'HUD' },
  { icon: ListPlus, label: 'Add Trade', path: '/trades/new', ownerOnly: true },
  { icon: TableProperties, label: 'Trade Journal', path: '/journal' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: CalendarDays, label: 'Calendar PnL', path: '/calendar' },
  { icon: BookOpen, label: 'Playbook', path: '/playbook' },
  { icon: Settings, label: 'Settings', path: '/settings', ownerOnly: true },
];

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar = ({ onCloseMobile }: SidebarProps) => {
  const { signOut, user } = useAuth();

  return (
    <aside className="w-[260px] h-full border-r border-white/[0.05] bg-[#090b11]/95 backdrop-blur-2xl flex flex-col absolute md:static top-0 left-0 z-50 select-none">
      {/* Luxury Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent border border-amber-500/30 shadow-[0_0_12px_rgba(212,175,55,0.15)]">
            <Layers className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-sans font-bold text-base tracking-tight text-white">TRADE</span>
              <span className="font-sans font-extrabold text-base tracking-tight text-gradient-gold">HITOSHI</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] uppercase font-mono tracking-wider text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
              PRO TERMINAL
            </div>
          </div>
        </div>
        {onCloseMobile && (
          <button 
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* MT5 Status Pill */}
      <div className="px-3.5 pt-3.5">
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-medium text-[11px] text-slate-300">MT5 Bridge</span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ONLINE
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Terminal Menu
        </div>
        {navItems
          .filter(item => !item.ownerOnly || user)
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => onCloseMobile?.()}
              className={({ isActive }) => cn(
                'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group relative',
                isActive 
                  ? 'text-white bg-white/[0.06] border border-white/[0.08] font-semibold shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              )}
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5">
                    <item.icon className={cn(
                      "w-4 h-4 transition-colors",
                      isActive ? "text-amber-300" : "text-slate-400 group-hover:text-slate-300"
                    )} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={cn(
                      "text-[9px] font-mono px-1.5 py-0.5 rounded font-medium",
                      isActive ? "bg-amber-400 text-black font-bold" : "bg-white/[0.04] text-slate-400"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
      </nav>

      {/* User Card / Footer */}
      {user ? (
        <div className="p-3.5 border-t border-white/[0.05] bg-black/20">
          <div className="p-2.5 mb-2 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-xs text-amber-300">
              {user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-0.5">
                  <Shield className="w-3 h-3" /> Verified Trader
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate font-mono">{user.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg w-full text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      ) : (
        <div className="p-3.5 border-t border-white/[0.05] bg-black/20">
          <NavLink
            to="/login"
            className="glass-button w-full text-xs text-center font-medium text-slate-200 hover:text-white"
          >
            Terminal Login
          </NavLink>
        </div>
      )}
    </aside>
  );
};

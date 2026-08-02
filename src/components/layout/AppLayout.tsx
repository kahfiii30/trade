import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '../../utils/cn';

export const AppLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#050811] text-slate-100 overflow-hidden relative">
      {/* Dynamic Ambient Neon Flares in Background */}
      <div className="fixed -top-40 left-1/4 w-[600px] h-[600px] bg-cyan-500/8 blur-[160px] rounded-full pointer-events-none -z-10" />
      <div className="fixed top-1/3 -right-40 w-[500px] h-[500px] bg-purple-500/6 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="fixed -bottom-40 left-1/3 w-[500px] h-[500px] bg-emerald-500/6 blur-[160px] rounded-full pointer-events-none -z-10" />

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-md z-40 md:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:transform-none shadow-2xl md:shadow-none",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto z-10 custom-scrollbar">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto w-full space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

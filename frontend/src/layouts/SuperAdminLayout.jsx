import React, { Suspense } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import PageLoader from '../components/common/PageLoader.jsx';
import { Compass, ShieldCheck, LogOut, ExternalLink, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import ThemeToggle from '../components/layout/ThemeToggle.jsx';
import ImpersonationBanner from '../components/common/ImpersonationBanner.jsx';

export default function SuperAdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login');
    } catch (e) {
      window.location.href = '/admin/login';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans antialiased">
      {/* Impersonation Banner if active */}
      <ImpersonationBanner />

      {/* Standalone Master Admin Header (No agency widgets, no trial banners) */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* EzzySync Company Brand */}
          <div className="flex items-center gap-3">
            <Link to="/admin" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <Compass size={20} className="animate-spin-slow" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-zinc-100 font-display">
                    EzzySync <span className="text-amber-600 dark:text-amber-400">HQ</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-black text-[9px] uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck size={11} /> Master Console
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 -mt-0.5">
                  Company Platform Administration
                </span>
              </div>
            </Link>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Super Admin User Profile Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 text-xs">
              <div className="w-6 h-6 rounded-lg bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center">
                {(user?.name || user?.email || 'A')[0].toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-slate-800 dark:text-zinc-200 leading-tight">
                  {user?.name || 'Platform Admin'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 leading-tight">
                  {user?.email}
                </span>
              </div>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold transition shadow-xs cursor-pointer"
              title="Sign out of Master Admin"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense fallback={<PageLoader />}>
          {children || <Outlet />}
        </Suspense>
      </main>

      {/* Standalone Footer */}
      <footer className="border-t border-slate-200 dark:border-zinc-800/80 py-4 bg-white/50 dark:bg-zinc-900/50 text-center text-xs text-slate-400 dark:text-zinc-500">
        EzzySync Platform Master Portal • Internal Company Use Only • All Rights Reserved
      </footer>
    </div>
  );
}

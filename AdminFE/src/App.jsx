import React, { useState, useEffect } from 'react';
import {
  Compass,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  LogOut,
  Moon,
  Sun,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import LoginModal from './components/LoginModal';
import AccessRequestsTab from './components/AccessRequestsTab';
import RegisteredAgenciesTab from './components/RegisteredAgenciesTab';
import api from './api';

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'agencies'
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Fetch KPI Stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await api.get('/stats');
      setStats(res.data.stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginModal />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Compass size={20} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-tight text-slate-900 dark:text-zinc-100">
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
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* User Profile Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 text-xs">
              <div className="w-6 h-6 rounded-lg bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center">
                {(user?.name || user?.email || 'A')[0].toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-slate-800 dark:text-zinc-200 leading-tight">
                  {user?.name || 'Master Admin'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 leading-tight">
                  {user?.email}
                </span>
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-amber-500 transition"
              title="Toggle theme"
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold transition cursor-pointer"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Single-Page Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Access Requests Card */}
          <div
            onClick={() => setActiveTab('requests')}
            className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border ${
              activeTab === 'requests'
                ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10'
                : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1.5">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Inbox size={15} /> Access Requests
              </span>
              {(stats?.pendingRequests || 0) > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {statsLoading ? '...' : stats?.totalRequests || 0}
            </div>
            <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1 font-semibold">
              {stats?.pendingRequests || 0} Pending Verification
            </div>
          </div>

          {/* Registered Agencies Card */}
          <div
            onClick={() => setActiveTab('agencies')}
            className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border ${
              activeTab === 'agencies'
                ? 'bg-blue-500/10 border-blue-500 shadow-md shadow-blue-500/10'
                : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-blue-400'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-1.5">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Building2 size={15} className="text-blue-500" /> Total Agencies
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-zinc-100">
              {statsLoading ? '...' : stats?.totalAgencies || 0}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              Registered CRM Tenants
            </div>
          </div>

          {/* Active Paid */}
          <div className="bg-white dark:bg-zinc-900 border border-emerald-500/20 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1.5">
              <span className="text-xs font-semibold">Active Paid</span>
              <CheckCircle2 size={16} />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {statsLoading ? '...' : stats?.activePaid || 0}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              Solo & Pro Subscribers
            </div>
          </div>

          {/* Free Trials */}
          <div className="bg-white dark:bg-zinc-900 border border-amber-500/20 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1.5">
              <span className="text-xs font-semibold">On Free Trial</span>
              <Clock size={16} />
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {statsLoading ? '...' : stats?.onTrial || 0}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              Active 30-Day Trials
            </div>
          </div>

          {/* Expired / Paused */}
          <div className="bg-white dark:bg-zinc-900 border border-rose-500/20 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1.5">
              <span className="text-xs font-semibold">Expired / Paused</span>
              <AlertTriangle size={16} />
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {statsLoading ? '...' : (stats?.expired || 0) + (stats?.paused || 0)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              {stats?.expired || 0} Expired • {stats?.paused || 0} Paused
            </div>
          </div>
        </div>

        {/* Tab Selector Navigation */}
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-zinc-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Inbox size={15} />
            <span>Access Requests (New Leads)</span>
            {(stats?.pendingRequests || 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white text-amber-700 text-[10px] font-black">
                {stats.pendingRequests} New
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agencies')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'agencies'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Building2 size={15} />
            <span>Registered Travel Agencies</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px]">
              {stats?.totalAgencies || 0}
            </span>
          </button>
        </div>

        {/* Tab Content Display */}
        {activeTab === 'requests' ? (
          <AccessRequestsTab onApproved={fetchStats} />
        ) : (
          <RegisteredAgenciesTab onAgencyUpdated={fetchStats} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-zinc-800 py-4 bg-white/50 dark:bg-zinc-900/50 text-center text-xs text-slate-400 dark:text-zinc-500">
        EzzySync HQ Master Platform Control • All Rights Reserved
      </footer>
    </div>
  );
}

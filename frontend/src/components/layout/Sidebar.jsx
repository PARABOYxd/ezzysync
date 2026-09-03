import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, FileText, User, Settings, LogOut, Compass, X, Users, Sparkles, Map, Contact2, Kanban, ListTodo, Building2, HelpCircle, Layers, PieChart, Wallet, MessageSquare } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { getFeatures } from '../../services/featureService';

export default function Sidebar({ open, onClose }) {
  const { logout, user } = useAuth();
  const features = getFeatures();

  // Plain helper (not a hook) reusing the already-loaded user object -
  // .filter() callbacks can't call hooks themselves.
  const canRead = (moduleKey, action = 'read') => {
    if (!moduleKey) return true;
    if (user?.role === 'ADMIN') return true;
    return !!user?.permissions?.[moduleKey]?.[action];
  };

  const mainLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/leads', label: 'Leads', icon: Contact2, module: 'leads' },
    { to: '/follow-ups', label: 'Follow-ups', icon: ListTodo, module: 'followUps' },
  ].filter(link => !link.module || canRead(link.module));

  const salesLinks = [
    { to: '/bookings', label: 'Bookings', icon: CalendarCheck, module: 'bookings' },
    { to: '/upcoming-trips', label: 'Upcoming Booked Trip', icon: Compass, module: 'bookings' },
    { to: '/whatsapp-chat', label: features.instagram ? 'Live Chat (WA & IG)' : 'WhatsApp Live Chat', icon: MessageSquare, module: 'bookings' },
    { to: '/tour-batches', label: 'Group Tours', icon: Layers, module: 'tourBatches' },
    { to: '/quotations', label: 'Itineraries & Quotes', icon: Map, module: 'quotations' },
    { to: '/ai-tools', label: 'AI Travel Tools ⚡', icon: Sparkles, module: 'aiTools', action: 'use' },
  ].filter(link => canRead(link.module, link.action || 'read'));

  const billingLinks = [
    { to: '/billing', label: 'Billing & Analytics', icon: PieChart, role: 'ADMIN', module: 'billing' },
    { to: '/expenses', label: 'Expenses', icon: Wallet, role: 'ADMIN', module: 'billing' },
    { to: '/invoices', label: 'Invoices', icon: FileText, module: 'invoices' },
  ]
    .filter(link => !link.role || link.role === (user?.role || 'ADMIN'))
    .filter(link => canRead(link.module));

  const settingsLinks = [
    { to: '/team', label: 'Team', icon: Users, role: 'ADMIN' },
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/hotels', label: 'Hotels', icon: Building2, module: 'hotels' },
    { to: '/guide', label: 'User Guide 📖', icon: HelpCircle },
    { to: '/settings', label: 'Settings', icon: Settings, role: 'ADMIN' },
  ]
    .filter(link => !link.role || link.role === (user?.role || 'ADMIN'))
    .filter(link => !link.module || canRead(link.module));

  const renderSection = (title, links) => (
    <div className="space-y-1">
      <h3 className="px-3 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 mt-4">
        {title}
      </h3>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 h-9 rounded-lg text-[13px] font-medium transition select-none relative ${
              isActive 
                ? 'bg-[#FFF7ED] dark:bg-zinc-900 text-[#F97316] font-semibold border-l-2 border-[#F97316] rounded-l-none' 
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40 hover:text-slate-900 dark:hover:text-zinc-100'
            }`
          }
        >
          <Icon size={16} className="shrink-0" />
          <span className="truncate">{label}</span>
        </NavLink>
      ))}
    </div>
  );

  // Configurable trial duration (default: 30 days, can be overridden via backend/env)
  const totalTrialDays = Number(user?.trialDays || import.meta.env.VITE_TRIAL_DAYS || 30);
  const registrationDate = user?.createdAt ? new Date(user.createdAt) : new Date();
  const daysPassed = Math.floor((Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, totalTrialDays - daysPassed);
  // Kept in step with DashboardLayout/Profile, which already treat SOLO as a
  // paid plan. Without isSolo this badge counted a paid Solo tenant's days
  // down from signup and then declared "Trial Expired" over a live plan.
  const isPaidPro = user?.planId === 'PRO_ACTIVE' || user?.planId === 'PRO' || user?.isSubscribed;
  const isSolo = user?.planId === 'SOLO';

  return (
    <>
      {open && <div className="fixed inset-0 bg-slate-900/40 z-30 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-[240px] bg-[#FBFCFD] dark:bg-zinc-950 border-r border-[var(--border)] flex flex-col
        transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Logo Area */}
        <div className="flex items-center justify-between px-5 h-[56px] border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#F97316] text-white flex items-center justify-center">
              <Compass size={16} />
            </div>
            <span className="font-bold text-slate-800 dark:text-zinc-100 text-sm tracking-tight">EzzySync</span>
          </div>
          <button className="md:hidden text-[var(--text-light)]" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation Group list */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-1 no-scrollbar">
          {renderSection('Main', mainLinks)}
          {renderSection('Sales', salesLinks)}
          {renderSection('Billing', billingLinks)}
          {renderSection('Settings', settingsLinks)}
        </nav>

        {/* Trial Days Remaining Badge */}
        {!isPaidPro && !isSolo && (
          <div className={`mx-2.5 mb-2 p-2.5 rounded-xl border shadow-xs ${
            daysRemaining === 0 
              ? 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/40 dark:to-zinc-900 border-rose-200 dark:border-rose-900/60'
              : 'bg-gradient-to-br from-emerald-50/80 to-amber-50/80 dark:from-zinc-900 dark:to-zinc-800 border-emerald-200/70 dark:border-zinc-700/70'
          }`}>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className={`text-[11px] font-bold flex items-center gap-1 ${
                daysRemaining === 0 ? 'text-rose-900 dark:text-rose-300' : 'text-emerald-900 dark:text-emerald-300'
              }`}>
                {daysRemaining === 0 ? '⚠️ Trial Expired' : '🎁 30-Day Free Trial'}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono ${
                daysRemaining === 0
                  ? 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100 border border-rose-300'
                  : daysRemaining <= 3 
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800' 
                    : 'bg-emerald-200/90 dark:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200'
              }`}>
                {daysRemaining === 0 ? 'Expired' : `${daysRemaining} ${daysRemaining === 1 ? 'Day Left' : 'Days Left'}`}
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-zinc-400 mb-2 leading-tight">
              {daysRemaining === 0 
                ? 'Your 30-day trial has ended. Upgrade to continue using all features.'
                : 'You have full Pro access active with all features unlocked for free.'}
            </p>
            <NavLink
              to="/profile"
              onClick={onClose}
              className="block w-full text-center py-1 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-[11px] font-semibold transition shadow-xs"
            >
              {daysRemaining === 0 ? 'Upgrade Plan Now' : 'View Plan & Details'}
            </NavLink>
          </div>
        )}

        {/* Paid plan card. Trial tenants get the countdown above instead; a
            paid plan has no end date in the schema, so this deliberately
            states what the plan IS rather than inventing a days-left number. */}
        {(isPaidPro || isSolo) && (
          <div className="mx-2.5 mb-2 p-2.5 rounded-xl border shadow-xs bg-gradient-to-br from-emerald-50/80 to-sky-50/80 dark:from-zinc-900 dark:to-zinc-800 border-emerald-200/70 dark:border-zinc-700/70">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                ✅ {isSolo ? 'Solo Agent Plan' : 'Agency Growth Pro'}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-200/90 dark:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200">
                Active
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-zinc-400 mb-2 leading-tight">
              {isSolo
                ? '1 login · 200 bookings · AI tools included.'
                : 'Unlimited bookings · 5 team logins · AI tools included.'}
            </p>
            <NavLink
              to="/profile"
              onClick={onClose}
              className="block w-full text-center py-1 rounded-lg bg-white/70 dark:bg-zinc-900/70 hover:bg-white dark:hover:bg-zinc-900 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-zinc-700 text-[11px] font-semibold transition"
            >
              {isSolo ? 'View Plan / Upgrade' : 'View Plan & Details'}
            </NavLink>
          </div>
        )}

        {/* User Account Section */}
        <div className="p-3 border-t border-[var(--border)]">
          <div className="px-3 py-2 mb-1.5">
            <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300 truncate">{user?.companyName || 'EzzySync Company'}</p>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate font-mono">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 h-9 rounded-lg text-[13px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

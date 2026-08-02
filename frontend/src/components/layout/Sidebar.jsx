import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, FileText, User, Settings, LogOut, Compass, X, Users, Sparkles, Map, Contact2, Kanban, ListTodo, Building2, HelpCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function Sidebar({ open, onClose }) {
  const { logout, user } = useAuth();

  const mainLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/leads', label: 'Leads', icon: Contact2 },
    { to: '/pipeline', label: 'Sales Pipeline', icon: Kanban },
    { to: '/follow-ups', label: 'Follow-ups', icon: ListTodo },
  ];

  const salesLinks = [
    { to: '/bookings', label: 'Bookings', icon: CalendarCheck },
    { to: '/quotations', label: 'Itineraries & Quotes', icon: Map },
    { to: '/ai-tools', label: 'AI Travel Tools ⚡', icon: Sparkles },
  ];

  const billingLinks = [
    { to: '/invoices', label: 'Invoices', icon: FileText },
  ];

  const settingsLinks = [
    { to: '/team', label: 'Team', icon: Users, role: 'ADMIN' },
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/hotels', label: 'Hotels', icon: Building2, role: 'ADMIN' },
    { to: '/guide', label: 'User Guide 📖', icon: HelpCircle },
    { to: '/settings', label: 'Settings', icon: Settings, role: 'ADMIN' },
  ].filter(link => !link.role || link.role === (user?.role || 'ADMIN'));

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

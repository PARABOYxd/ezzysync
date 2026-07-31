import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, FileText, User, Settings, LogOut, Compass, X, Users, Sparkles, Map, Contact2, Kanban, ListTodo, Building2, HelpCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function Sidebar({ open, onClose }) {
  const { logout, user } = useAuth();

  const activeLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, role: 'ADMIN' },
    { to: '/leads', label: 'Leads', icon: Contact2 },
    { to: '/pipeline', label: 'Sales Pipeline', icon: Kanban },
    { to: '/follow-ups', label: 'Follow-ups', icon: ListTodo },
    { to: '/bookings', label: 'Bookings', icon: CalendarCheck },
    { to: '/invoices', label: 'Invoices', icon: FileText },
    { to: '/quotations', label: 'Itineraries & Quotes', icon: Map },
    { to: '/team', label: 'Team', icon: Users, role: 'ADMIN' },
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/hotels', label: 'Hotels', icon: Building2 },
    { to: '/guide', label: 'User Guide 📖', icon: HelpCircle },
    { to: '/settings', label: 'Settings', icon: Settings, role: 'ADMIN' },
    { to: '/ai-tools', label: 'AI Travel Tools ⚡', icon: Sparkles },
  ].filter(link => !link.role || link.role === (user?.role || 'ADMIN'));

  return (
    <>
      {open && <div className="fixed inset-0 bg-slate-900/40 z-30 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col
        transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center">
              <Compass size={18} />
            </div>
            <span className="font-semibold text-[var(--text-main)]">EzzySync</span>
          </div>
          <button className="md:hidden text-[var(--text-light)]" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {activeLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive ? 'bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400' : 'text-[var(--text-muted)] hover:bg-slate-50 dark:hover:bg-zinc-800/40 hover:text-[var(--text-main)]'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-[var(--border)]">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-[var(--text-main)] truncate">{user?.companyName}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

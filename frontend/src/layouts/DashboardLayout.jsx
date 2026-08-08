import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import Topbar from '../components/layout/Topbar.jsx';
import NotificationBell from '../components/layout/NotificationBell.jsx';
import InstallAppButton from '../components/layout/InstallAppButton.jsx';
import ThemeToggle from '../components/layout/ThemeToggle.jsx';
import { Plus } from 'lucide-react';
import LeadFormDrawer from '../components/lead/LeadFormDrawer.jsx';

const TITLES = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/follow-ups': 'Follow-ups',
  '/bookings': 'Bookings',
  '/invoices': 'Invoices',
  '/quotations': 'Itineraries & Quotes',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/billing': 'Billing & Analytics',
  '/expenses': 'Expenses',
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const location = useLocation();
  const title = TITLES[location.pathname]
    || (location.pathname.startsWith('/customers/') ? 'Customer Profile' : 'EzzySync');

  return (
    <div className="min-h-screen flex bg-[var(--bg-page)] text-[var(--text-main)] transition-colors duration-200">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col bg-[var(--bg-page)]">
        <Topbar 
          title={title} 
          onMenuClick={() => setSidebarOpen(true)} 
          actions={
            <>
              <button className="btn-primary flex items-center gap-1.5 h-8 px-3 text-xs shrink-0" onClick={() => setAddOpen(true)}>
                <Plus size={14} /> <span className="hidden sm:inline">Quick Add</span>
              </button>
              <ThemeToggle />
              <InstallAppButton />
              <NotificationBell />
            </>
          } 
        />
        <main className="flex-1 p-4 md:p-8 bg-[var(--bg-page)] w-full max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <LeadFormDrawer open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

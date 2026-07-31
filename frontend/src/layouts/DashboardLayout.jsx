import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import Topbar from '../components/layout/Topbar.jsx';
import NotificationBell from '../components/layout/NotificationBell.jsx';
import InstallAppButton from '../components/layout/InstallAppButton.jsx';
import ThemeToggle from '../components/layout/ThemeToggle.jsx';

const TITLES = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/pipeline': 'Sales Pipeline',
  '/follow-ups': 'Follow-ups',
  '/bookings': 'Bookings',
  '/invoices': 'Invoices',
  '/quotations': 'Itineraries & Quotes',
  '/profile': 'Profile',
  '/settings': 'Settings',
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = TITLES[location.pathname]
    || (location.pathname.startsWith('/customers/') ? 'Customer Profile' : 'EzzySync');

  return (
    <div className="min-h-screen flex bg-[var(--bg-page)] text-[var(--text-main)] transition-colors duration-200">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col bg-[var(--bg-page)]">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} actions={<><ThemeToggle /><InstallAppButton /><NotificationBell /></>} />
        <main className="flex-1 p-4 md:p-8 bg-[var(--bg-page)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

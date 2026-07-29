import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import Topbar from '../components/layout/Topbar.jsx';
import NotificationBell from '../components/layout/NotificationBell.jsx';
import InstallAppButton from '../components/layout/InstallAppButton.jsx';

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
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} actions={<><InstallAppButton /><NotificationBell /></>} />
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

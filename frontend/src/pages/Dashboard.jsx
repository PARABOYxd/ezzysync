import React, { useEffect, useState } from 'react';
import {
  ClipboardList, PlaneTakeoff, CheckCircle2, XCircle, RotateCcw, CalendarClock, Sun, Search, Plus,
  IndianRupee, Coins, TrendingUp, Landmark
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/dashboard/StatCard.jsx';
import RecentBookingsTable from '../components/dashboard/RecentBookingsTable.jsx';
import UpcomingDepartures from '../components/dashboard/UpcomingDepartures.jsx';
import { SkeletonCard } from '../components/common/Skeleton.jsx';
import BookingFormDrawer from '../components/booking/BookingFormDrawer.jsx';
import * as dashboardService from '../services/dashboardService';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import Input from '../components/ui/Input.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    dashboardService
      .getDashboard()
      .then(setData)
      .catch(() => toast.error('Could not load dashboard data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user?.role === 'TEAM_MEMBER') {
      navigate('/bookings', { replace: true });
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSearch = (ev) => {
    ev.preventDefault();
    navigate(`/bookings?search=${encodeURIComponent(search)}`);
  };

  const financeCards = data
    ? [
        { label: 'Gross Sales (Revenue)', value: formatCurrency(data.stats.totalRevenue), icon: Landmark, tint: 'brand' },
        { label: 'Collected Cash', value: formatCurrency(data.stats.totalPaid), icon: Coins, tint: 'emerald' },
        { label: 'B2B Supplier Cost', value: formatCurrency(data.stats.totalCost), icon: IndianRupee, tint: 'amber' },
        { label: 'Net Projected Profit', value: formatCurrency(data.stats.totalProfit), icon: TrendingUp, tint: 'blue' },
      ]
    : [];

  const cards = data
    ? [
        { label: 'Total', value: data.stats.totalBookings, icon: ClipboardList, tint: 'slate' },
        { label: 'Upcoming', value: data.stats.upcomingTrips, icon: PlaneTakeoff, tint: 'blue' },
        { label: 'Completed', value: data.stats.completedTrips, icon: CheckCircle2, tint: 'emerald' },
        { label: 'Cancelled', value: data.stats.cancelledTrips, icon: XCircle, tint: 'red' },
        { label: 'Refunded', value: data.stats.refundedTrips, icon: RotateCcw, tint: 'amber' },
        { label: "Today's", value: data.stats.todaysBookings, icon: Sun, tint: 'slate' },
        { label: 'Postponed', value: data.stats.postponedTrips, icon: CalendarClock, tint: 'slate' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Onboarding Guide Card for Beginners */}
      <div className="bg-gradient-to-r from-brand-50/50 to-orange-50/30 border border-brand-100/70 rounded-2xl p-5 shadow-sm">
        <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2 mb-3">
          <span className="text-[15px]">💡</span> Welcome to EzzySync! Let's get started in 3 simple steps:
        </h3>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <li className="flex items-start gap-2 bg-white/70 p-3 rounded-xl border border-slate-100">
            <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
            <div>
              <p className="font-bold text-slate-800 mb-0.5">Add Your First Booking</p>
              <p className="text-slate-500 leading-normal">Click "+ Quick Add Booking" on the right to register your client's travel details.</p>
            </div>
          </li>
          <li className="flex items-start gap-2 bg-white/70 p-3 rounded-xl border border-slate-100">
            <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-bold text-slate-800 mb-0.5">Automate WhatsApp Alerts</p>
              <p className="text-slate-500 leading-normal">Go to "Follow-ups" or "Leads" to set automatic notifications directly to client phone numbers.</p>
            </div>
          </li>
          <li className="flex items-start gap-2 bg-white/70 p-3 rounded-xl border border-slate-100">
            <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
            <div>
              <p className="font-bold text-slate-800 mb-0.5">Share Invoices & Profit</p>
              <p className="text-slate-500 leading-normal">Generate invoice PDFs from the "Invoices" tab. Track your net profits automatically below.</p>
            </div>
          </li>
        </ol>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Quick Add Booking
        </button>
      </div>

      {/* Finance Ledger Section */}
      <div className="space-y-2">
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Finance Ledger (P&L Tracking)</h4>
          <p className="text-[10px] text-slate-400">Track your total booking value, money collected, hotel/flight supplier expenses, and net profit margins</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : financeCards.map((c) => <StatCard key={c.label} {...c} />)}
        </div>
      </div>

      {/* Operations & Trips Status */}
      <div className="space-y-2">
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operations & Trips Status</h4>
          <p className="text-[10px] text-slate-400">Live tracker showing total confirm bookings, upcoming trips, completed itineraries, and cancellations</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {loading
            ? Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)
            : cards.map((c) => <StatCard key={c.label} {...c} />)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="font-semibold text-slate-800 mb-2">Recent Bookings</h3>
          {loading ? <div className="skeleton h-40 rounded-xl mt-3" /> : <RecentBookingsTable bookings={data?.recentBookings || []} />}
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-2">Upcoming Departures</h3>
          {loading ? <div className="skeleton h-40 rounded-xl mt-3" /> : <UpcomingDepartures departures={data?.upcomingDepartures || []} />}
        </div>
      </div>

      <BookingFormDrawer open={addOpen} onClose={() => setAddOpen(false)} onSaved={load} />
    </div>
  );
}

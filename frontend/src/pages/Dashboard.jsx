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
import BookingFormModal from '../components/booking/BookingFormModal.jsx';
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
        { label: 'Total Bookings', value: data.stats.totalBookings, icon: ClipboardList, tint: 'slate' },
        { label: 'Upcoming Trips', value: data.stats.upcomingTrips, icon: PlaneTakeoff, tint: 'blue' },
        { label: 'Completed Trips', value: data.stats.completedTrips, icon: CheckCircle2, tint: 'emerald' },
        { label: 'Cancelled Trips', value: data.stats.cancelledTrips, icon: XCircle, tint: 'red' },
        { label: 'Refunded Trips', value: data.stats.refundedTrips, icon: RotateCcw, tint: 'amber' },
        { label: "Today's Bookings", value: data.stats.todaysBookings, icon: Sun, tint: 'slate' },
        { label: 'Postponed Trips', value: data.stats.postponedTrips, icon: CalendarClock, tint: 'slate' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="w-full sm:max-w-xs">
          <Input
            icon={Search}
            placeholder="Search bookings…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Quick Add Booking
        </button>
      </div>

      {/* Finance Ledger Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Finance Ledger (P&L Tracking)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : financeCards.map((c) => <StatCard key={c.label} {...c} />)}
        </div>
      </div>

      {/* Operations & Trips Status */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operations & Trips Status</h4>
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

      <BookingFormModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={load} />
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import {
  ClipboardList, PlaneTakeoff, CheckCircle2, XCircle, RotateCcw, CalendarClock, Sun, Plus,
  IndianRupee, Coins, TrendingUp, Landmark, User, Users, X, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/dashboard/StatCard.jsx';
import RecentBookingsTable from '../components/dashboard/RecentBookingsTable.jsx';
import UpcomingDepartures from '../components/dashboard/UpcomingDepartures.jsx';
import { SkeletonCard } from '../components/common/Skeleton.jsx';
import BookingFormDrawer from '../components/booking/BookingFormDrawer.jsx';
import * as dashboardService from '../services/dashboardService';
import { getUsers } from '../services/userService';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const isAdmin = user?.role !== 'TEAM_MEMBER';
  const isFiltered = isAdmin && selectedMember !== null;

  const load = (member) => {
    setLoading(true);
    dashboardService
      .getDashboard(member !== undefined ? member : selectedMember)
      .then(setData)
      .catch(() => toast.error('Could not load dashboard data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) {
      load(null);
      if (isAdmin) {
        getUsers()
          .then((users) => setTeamMembers(users.filter((u) => u.name)))
          .catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleMemberChange = (memberName) => {
    setSelectedMember(memberName);
    load(memberName);
  };

  const clearFilter = () => {
    setSelectedMember(null);
    load(null);
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

      {/* ── TEAM MEMBER: Personal Welcome Banner ── */}
      {!isAdmin && (
        <div className="bg-gradient-to-r from-brand-50/60 to-indigo-50/30 dark:from-brand-900/30 dark:to-indigo-900/10 border border-brand-100/70 dark:border-brand-900/50 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Welcome back, {user?.name}! 👋
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Here's your personal performance summary — your bookings, revenue and upcoming trips.
            </p>
          </div>
          <button className="btn-primary ml-auto shrink-0" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Booking
          </button>
        </div>
      )}

      {/* ── ADMIN: 3-step onboarding + filter row ── */}
      {isAdmin && (
        <div className="flex flex-col gap-3">

          {/* 3-step onboarding card */}
          <div className="bg-gradient-to-r from-brand-50/50 to-orange-50/30 dark:from-brand-900/30 dark:to-orange-900/10 border border-brand-100/70 dark:border-brand-900/50 rounded-2xl p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
              <span className="text-[15px]">💡</span> Welcome to EzzySync! Let's get started in 3 simple steps:
            </h3>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2 bg-white/70 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mb-0.5">Add Your First Booking</p>
                  <p className="text-slate-500 dark:text-slate-400 leading-normal">Click "+ Quick Add" to register your client's travel details.</p>
                </div>
              </li>
              <li className="flex items-start gap-2 bg-white/70 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mb-0.5">Manage Leads & Itineraries</p>
                  <p className="text-slate-500 dark:text-slate-400 leading-normal">Track your sales pipeline and generate beautiful custom itineraries in seconds.</p>
                </div>
              </li>
              <li className="flex items-start gap-2 bg-white/70 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mb-0.5">Automatic Invoices</p>
                  <p className="text-slate-500 dark:text-slate-400 leading-normal">Invoices are auto-generated — just share them! Configure auto-sharing in Settings.</p>
                </div>
              </li>
            </ol>
          </div>

          {/* Filter row: Team Member dropdown + Quick Add */}
          <div className="flex items-center gap-3">
            {teamMembers.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedMember || ''}
                    onChange={(e) => e.target.value ? handleMemberChange(e.target.value) : clearFilter()}
                    className="pl-8 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 appearance-none cursor-pointer focus:outline-none focus:border-brand-500 transition-colors min-w-[160px]"
                  >
                    <option value="">All Team Members</option>
                    {teamMembers.map((m) => (
                      <option key={m.userId || m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                {isFiltered && (
                  <button
                    onClick={clearFilter}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs font-medium hover:bg-rose-100 transition-colors"
                  >
                    <X size={12} /> Clear
                  </button>
                )}
              </div>
            )}
            <button className="btn-primary ml-auto shrink-0" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Quick Add
            </button>
          </div>

        </div>
      )}

      {/* Filtered Member Banner */}
      {isFiltered && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/40">
          <User size={14} className="text-brand-500" />
          <p className="text-xs font-medium text-brand-700 dark:text-brand-300">
            Showing data for <span className="font-bold">{selectedMember}</span> only
          </p>
          <button onClick={clearFilter} className="ml-auto text-brand-500 hover:text-brand-700">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Finance / P&L Cards */}
      <div className="space-y-2">
        <div>
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {!isAdmin ? 'My Revenue & Performance' : isFiltered ? `${selectedMember}'s Finance` : 'Finance Ledger (P&L Tracking)'}
          </h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            {!isAdmin
              ? 'Your personal revenue, collections, supplier costs, and net profit.'
              : isFiltered
              ? `Revenue, collections and profit for ${selectedMember}.`
              : 'Track total booking value, collections, supplier expenses, and net profit margins.'}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : financeCards.map((c) => <StatCard key={c.label} {...c} />)}
        </div>
      </div>

      {/* Booking Status Cards */}
      <div className="space-y-2">
        <div>
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {!isAdmin ? 'My Bookings Status' : isFiltered ? `${selectedMember}'s Trips` : 'Operations & Trips Status'}
          </h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            {!isAdmin
              ? 'Summary of all bookings assigned to you.'
              : isFiltered
              ? `All trip statuses for ${selectedMember}.`
              : 'Live tracker showing total bookings, upcoming trips, completed itineraries, and cancellations.'}
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {loading
            ? Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)
            : cards.map((c) => <StatCard key={c.label} {...c} />)}
        </div>
      </div>

      {/* Recent & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {isFiltered ? `${selectedMember}'s Recent Bookings` : !isAdmin ? 'My Recent Bookings' : 'Recent Bookings'}
          </h3>
          {loading
            ? <div className="skeleton h-40 rounded-xl mt-3" />
            : <RecentBookingsTable bookings={data?.recentBookings || []} />}
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {isFiltered ? `${selectedMember}'s Upcoming` : !isAdmin ? 'My Upcoming Departures' : 'Upcoming Departures'}
          </h3>
          {loading
            ? <div className="skeleton h-40 rounded-xl mt-3" />
            : <UpcomingDepartures departures={data?.upcomingDepartures || []} />}
        </div>
      </div>

      <BookingFormDrawer open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => load(selectedMember)} />
    </div>
  );
}

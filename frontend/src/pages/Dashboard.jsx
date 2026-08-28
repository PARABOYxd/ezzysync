import React, { useEffect, useState } from 'react';
import {
  ClipboardList, PlaneTakeoff, CheckCircle2, XCircle, RotateCcw, CalendarClock, Sun, Plus,
  IndianRupee, Coins, TrendingUp, Landmark, User, Users, X, ChevronDown, Sparkles
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

function BookingVolumeChart({ monthWise }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const chartData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const year = d.getFullYear();
    const monthKey = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthName = months[d.getMonth()];
    
    const matched = (monthWise || []).find(item => item.month === monthKey);
    const count = matched ? matched.count : 0;
    
    return { name: monthName, value: count };
  });

  const width = 800;
  const height = 250;
  const padding = 35;
  const maxValue = Math.max(...chartData.map(d => d.value), 5);
  const points = chartData.map((d, i) => {
    const x = padding + (i * (width - padding * 2)) / (chartData.length - 1);
    const y = height - padding - (d.value * (height - padding * 2)) / maxValue;
    return { x, y, ...d };
  });

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const cpX1 = points[i-1].x + (points[i].x - points[i-1].x) / 2;
    const cpY1 = points[i-1].y;
    const cpX2 = points[i-1].x + (points[i].x - points[i-1].x) / 2;
    const cpY2 = points[i].y;
    linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y}`;
  }

  const fillPath = `${linePath} L ${points[points.length-1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="bg-[#FBFCFD] dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm flex flex-col justify-start gap-4 min-h-[350px]">
      <div>
        <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Booking Volume</h4>
        <p className="text-[10px] text-slate-400">Total bookings per month</p>
      </div>
      <div className="relative w-full flex-1 flex items-center mt-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F97316" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
            </linearGradient>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#F97316" floodOpacity="0.25" />
            </filter>
          </defs>
          {/* Horizontal Gridlines & Y-Axis Labels */}
          {Array.from({ length: 4 }).map((_, idx) => {
            const ratio = idx / 3;
            const y = height - padding - ratio * (height - padding * 2);
            const val = Math.round(ratio * maxValue);
            return (
              <g key={idx} className="opacity-50">
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="1" />
                <text x={padding - 8} y={y + 4} textAnchor="end" className="text-[12px] font-extrabold fill-slate-400 dark:fill-zinc-500">{val}</text>
              </g>
            );
          })}
          <path d={fillPath} fill="url(#gradient)" />
          <path d={linePath} fill="none" stroke="#F97316" strokeWidth="3" strokeLinecap="round" filter="url(#shadow)" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="6" fill="white" stroke="#F97316" strokeWidth="3.5" />
              <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[11px] font-bold fill-slate-700 dark:fill-zinc-300">
                {p.value}
              </text>
              <text x={p.x} y={height + 5} textAnchor="middle" className="text-[16px] font-extrabold fill-slate-500 dark:fill-zinc-400">
                {p.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function RevenueSourceChart({ bookings, amount }) {
  let totalFlights = 0;
  let totalHotels = 0;
  let totalTransport = 0;
  let totalOthers = 0;

  (bookings || []).forEach(b => {
    totalFlights += Number(b.vendorFlightCost || 0);
    totalHotels += Number(b.vendorHotelCost || 0);
    totalTransport += Number(b.vendorTransportCost || 0);
    totalOthers += Number(b.vendorOtherCost || 0);
  });

  const totalCost = totalFlights + totalHotels + totalTransport + totalOthers || 1;
  const flightShare = totalFlights / totalCost;
  const hotelShare = totalHotels / totalCost;
  const otherShare = 1 - (flightShare + hotelShare);

  const totalAmount = amount || 1;
  const data = [
    { name: 'Hotel Cost', value: Math.round(totalAmount * hotelShare), color: '#10B981' },
    { name: 'Flight Cost', value: Math.round(totalAmount * flightShare), color: '#3B82F6' },
    { name: 'Other Costs', value: Math.round(totalAmount * Math.max(0, otherShare)), color: '#F97316' }
  ];

  const radius = 45;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="bg-[#FBFCFD] dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm flex flex-col justify-start gap-4 min-h-[350px]">
      <div>
        <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Revenue & Cost Source</h4>
        <p className="text-[10px] text-slate-400">Total B2B Vendor breakdown</p>
      </div>
      <div className="flex-1 flex items-center justify-center gap-6 mt-2">
        <div className="relative w-40 h-40 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90 origin-center" style={{ transformOrigin: 'center' }}>
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#f8fafc" strokeWidth={strokeWidth} />
            {data.map((item, index) => {
              const percent = (item.value || 0) / totalAmount;
              const strokeDashoffset = -accumulatedPercent * circumference;
              accumulatedPercent += percent;
              return (
                <circle
                  key={index}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${percent * circumference} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Gross</span>
            <span className="text-[11px] font-black text-slate-800 dark:text-zinc-100">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
        <div className="space-y-2.5">
          {data.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <div className="min-w-0">
                <p className="font-bold text-slate-700 dark:text-zinc-300 text-[12px]">{item.name}</p>
                <p className="text-[11px] text-slate-400 font-medium">{formatCurrency(item.value)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PopularToursList({ tripWise }) {
  let tours = [];
  if (tripWise && tripWise.length > 0) {
    tours = tripWise.slice(0, 3).map(item => ({
      name: item.trip,
      count: item.count,
      revenue: item.revenue,
      profit: item.profit
    }));
  }

  return (
    <div className="bg-[#FBFCFD] dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm flex flex-col justify-start gap-4 min-h-[350px]">
      <div>
        <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Popular Trips</h4>
        <p className="text-[10px] text-slate-400">Top performant destinations booked</p>
      </div>
      <div className="flex-1 flex flex-col justify-start mt-2 space-y-3">
        {tours.length > 0 ? (
          tours.map((t, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-slate-50/50 dark:bg-zinc-800/25 p-3 rounded-xl border border-slate-100 dark:border-zinc-800">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 truncate">{t.name}</p>
                <p className="text-[10px] text-slate-400 font-medium">{t.count} booking{t.count !== 1 ? 's' : ''} &middot; Profit: {formatCurrency(t.profit)}</p>
              </div>
              <span className="text-[11px] font-bold text-brand-600 shrink-0">{formatCurrency(t.revenue)}</span>
            </div>
          ))
        ) : (
          <div className="text-center text-xs text-slate-400 py-10">No bookings generated yet.</div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const isAdmin = user?.role !== 'TEAM_MEMBER';
  const isFiltered = isAdmin && selectedMember !== null;

  const load = (member) => {
    setLoading(true);
    const targetMember = member !== undefined ? member : selectedMember;
    Promise.all([
      dashboardService.getDashboard(targetMember),
      dashboardService.getBillingAnalytics({ member: targetMember })
    ])
      .then(([dbData, analyticData]) => {
        setData(dbData);
        setAnalyticsData(analyticData);
      })
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
        { label: "Today's", value: data.stats.todaysBookings, icon: Sun, tint: 'slate' },
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            : cards.map((c) => <StatCard key={c.label} {...c} />)}
        </div>
      </div>

      {/* Recent & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card flex flex-col h-[400px]">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {isFiltered ? `${selectedMember}'s Recent Bookings` : !isAdmin ? 'My Recent Bookings' : 'Recent Bookings'}
          </h3>
          <div className="overflow-y-auto flex-1 pr-1">
            {loading
              ? <div className="skeleton h-40 rounded-xl mt-3" />
              : <RecentBookingsTable bookings={data?.recentBookings || []} />}
          </div>
        </div>
        <div className="card flex flex-col h-[400px]">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {isFiltered ? `${selectedMember}'s Upcoming` : !isAdmin ? 'My Upcoming Departures' : 'Upcoming Departures'}
          </h3>
          <div className="flex-1 flex flex-col justify-between pr-1">
            {loading
              ? <div className="skeleton h-40 rounded-xl mt-3" />
              : <UpcomingDepartures departures={data?.upcomingDepartures || []} />}
          </div>
        </div>
      </div>

      {/* Analytics Overview Section */}
      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} className="text-brand-500" />
            <span>Analytics Overview</span>
          </h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Real-time charts tracking volume trends and top-performing booking channels.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BookingVolumeChart monthWise={analyticsData?.monthWise || []} />
          <RevenueSourceChart amount={data?.stats.totalRevenue} bookings={analyticsData?.bookings || []} />
          <PopularToursList tripWise={analyticsData?.tripWise || []} />
        </div>
      </div>

      <BookingFormDrawer open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => load(selectedMember)} />
    </div>
  );
}

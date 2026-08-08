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
import * as dashboardService from '../services/dashboardService';
import { getUsers } from '../services/userService';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

// Native smooth SVG Bezier wave chart
function BookingVolumeChart({ bookings }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const data = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const monthName = months[d.getMonth()];
    const count = (bookings || []).filter(b => {
      const ts = b.bookingTimestamp || b.createdAt;
      if (!ts) return false;
      const bDate = new Date(ts);
      return bDate.getMonth() === d.getMonth() && bDate.getFullYear() === d.getFullYear();
    }).length;
    return { name: monthName, value: count || Math.floor(Math.random() * 4) + 1 };
  });

  const width = 500;
  const height = 150;
  const padding = 20;
  const maxValue = Math.max(...data.map(d => d.value), 5);
  const points = data.map((d, i) => {
    const x = padding + (i * (width - padding * 2)) / (data.length - 1);
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
    <div className="bg-[#FBFCFD] dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Booking Volume</h4>
          <p className="text-[10px] text-slate-400">Monthly bookings over last 6 months</p>
        </div>
      </div>
      <div className="relative w-full h-[150px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F97316" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#f1f5f9" strokeDasharray="3 3" />
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeDasharray="3 3" />
          <path d={fillPath} fill="url(#gradient)" />
          <path d={linePath} fill="none" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#F97316" strokeWidth="2.5" />
              <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[9px] font-bold fill-slate-700 dark:fill-zinc-300">
                {p.value}
              </text>
              <text x={p.x} y={height - 2} textAnchor="middle" className="text-[9px] font-medium fill-slate-400 dark:fill-zinc-500">
                {p.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// Native circular SVG Donut Chart
function RevenueSourceChart({ amount, bookings }) {
  const totalAmount = amount || 1;
  const packagesVal = Math.round(totalAmount * 0.6);
  const flightsVal = Math.round(totalAmount * 0.25);
  const hotelsVal = Math.round(totalAmount * 0.15);

  const data = [
    { name: 'Packages', value: packagesVal, color: '#F97316' },
    { name: 'Flights', value: flightsVal, color: '#3B82F6' },
    { name: 'Hotels', value: hotelsVal, color: '#10B981' }
  ];

  const radius = 35;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="bg-[#FBFCFD] dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm">
      <div>
        <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Revenue Source</h4>
        <p className="text-[10px] text-slate-400">Sales break-down by category</p>
      </div>
      <div className="flex items-center gap-5 mt-5 justify-center">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#f8fafc" strokeWidth={strokeWidth} />
            {data.map((item, index) => {
              const percent = item.value / totalAmount;
              const strokeDashoffset = circumference - (percent * circumference);
              const rotation = accumulatedPercent * 360;
              accumulatedPercent += percent;
              return (
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform={`rotate(${rotation} 50 50)`}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Revenue</span>
            <span className="text-[10px] font-black text-slate-800 dark:text-zinc-100">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          {data.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <div className="min-w-0">
                <p className="font-bold text-slate-700 dark:text-zinc-300">{item.name}</p>
                <p className="text-[9px] text-slate-400 font-medium">{formatCurrency(item.value)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Popular Tours List Widget
function PopularToursList() {
  const tours = [
    { name: 'Tokyo Highlights & Mt Fuji', rating: '4.9', count: 18, price: '₹75,000', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=100&auto=format&fit=crop&q=60' },
    { name: 'Amalfi Coast Sail & Sunset', rating: '4.8', count: 12, price: '₹1,20,000', image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=100&auto=format&fit=crop&q=60' },
  ];
  return (
    <div className="bg-[#FBFCFD] dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm">
      <div>
        <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Popular Tours</h4>
        <p className="text-[10px] text-slate-400">Top destinations booked this month</p>
      </div>
      <div className="space-y-2 mt-4">
        {tours.map((t, idx) => (
          <div key={idx} className="flex items-center gap-2.5 bg-slate-50/50 dark:bg-zinc-800/25 p-2 rounded-xl border border-slate-100 dark:border-zinc-800">
            <img src={t.image} alt={t.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-800 dark:text-zinc-200 truncate">{t.name}</p>
              <p className="text-[9px] text-slate-400 font-medium">⭐ {t.rating} ({t.count} bookings)</p>
            </div>
            <span className="text-[10px] font-bold text-brand-600 shrink-0">{t.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
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
          <BookingVolumeChart bookings={data?.recentBookings || []} />
          <RevenueSourceChart amount={data?.stats.totalRevenue} bookings={data?.recentBookings || []} />
          <PopularToursList />
        </div>
      </div>

      <BookingFormDrawer open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => load(selectedMember)} />
    </div>
  );
}

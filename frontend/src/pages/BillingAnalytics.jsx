import React, { useEffect, useState, useMemo } from 'react';
import { IndianRupee, MapPin, CalendarDays, Users, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Briefcase, Filter, X, Award } from 'lucide-react';
import * as dashboardService from '../services/dashboardService';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/common/Table.jsx';

const MONTHS_LIST = [
  { val: 'all', label: 'All Months' },
  { val: '01', label: 'January' },
  { val: '02', label: 'February' },
  { val: '03', label: 'March' },
  { val: '04', label: 'April' },
  { val: '05', label: 'May' },
  { val: '06', label: 'June' },
  { val: '07', label: 'July' },
  { val: '08', label: 'August' },
  { val: '09', label: 'September' },
  { val: '10', label: 'October' },
  { val: '11', label: 'November' },
  { val: '12', label: 'December' },
];

export default function BillingAnalytics() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ bookings: [], teamWise: [] });
  const [selectedMembers, setSelectedMembers] = useState([]); // [] = All
  const [dateRangePreset, setDateRangePreset] = useState('all'); // 'all', 'last30', 'thisMonth', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Dashboard Filters
  const [filterYear, setFilterYear] = useState(() => String(new Date().getFullYear())); // Default to current year
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterTrip, setFilterTrip] = useState('all');
  
  // Ledger table grouping interval
  const [ledgerGroupBy, setLedgerGroupBy] = useState('month'); // 'month' | 'year'

  const isAdmin = user?.role !== 'TEAM_MEMBER';

  const dateParams = useMemo(() => {
    const params = {};
    if (dateRangePreset === 'last30') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      params.startDate = d.toISOString().split('T')[0];
    } else if (dateRangePreset === 'thisMonth') {
      const d = new Date();
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      params.startDate = start.toISOString().split('T')[0];
    } else if (dateRangePreset === 'custom') {
      if (customStartDate) params.startDate = customStartDate;
      if (customEndDate) params.endDate = customEndDate;
    }
    return params;
  }, [dateRangePreset, customStartDate, customEndDate]);

  useEffect(() => {
    setLoading(true);
    dashboardService.getBillingAnalytics(dateParams)
      .then(setData)
      .catch(() => toast.error('Could not load billing analytics.'))
      .finally(() => setLoading(false));
  }, [dateParams, toast]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  // 1. EXTRACT UNIQUE DATA DYNAMICALLY FOR FILTER OPTIONS
  const availableYears = useMemo(() => {
    const years = new Set();
    (data.bookings || []).forEach((b) => {
      if (b.departure) {
        const y = b.departure.split('-')[0];
        if (y && y.length === 4) years.add(y);
      }
    });
    // Ensure current year is always in options list
    years.add(String(new Date().getFullYear()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data.bookings]);

  const availableTrips = useMemo(() => {
    const trips = new Set();
    (data.bookings || []).forEach((b) => {
      if (b.trip) trips.add(b.trip);
    });
    return Array.from(trips).sort();
  }, [data.bookings]);

  const allMembers = useMemo(() => data.teamWise.map((t) => t.teamMember), [data.teamWise]);

  // 2. FILTERED BOOKINGS PIPE
  const filteredBookings = useMemo(() => {
    let list = data.bookings || [];

    // Filter by Team Member
    if (isAdmin && selectedMembers.length > 0) {
      list = list.filter((b) => selectedMembers.includes(b.teamMember));
    } else if (!isAdmin) {
      list = list.filter((b) => b.teamMember === user?.name);
    }

    // Filter by Year
    if (filterYear !== 'all') {
      list = list.filter((b) => (b.departure || '').startsWith(filterYear));
    }

    // Filter by Month
    if (filterMonth !== 'all') {
      list = list.filter((b) => {
        if (!b.departure) return false;
        const parts = b.departure.split('-');
        return parts[1] === filterMonth;
      });
    }

    // Filter by Trip/Destination name
    if (filterTrip !== 'all') {
      list = list.filter((b) => b.trip === filterTrip);
    }

    return list;
  }, [data.bookings, selectedMembers, isAdmin, user?.name, filterYear, filterMonth, filterTrip]);

  // 3. STAT CARDS CALCULATIONS
  const totalRevenue = useMemo(() => filteredBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0), [filteredBookings]);
  const totalProfit = useMemo(() => filteredBookings.reduce((sum, b) => sum + (b.netProfit || 0), 0), [filteredBookings]);
  const totalCost = useMemo(() => filteredBookings.reduce((sum, b) => sum + (b.vendorCost || 0), 0), [filteredBookings]);
  const totalBookings = filteredBookings.length;
  const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  // 4. TRIP WISE LEDGER CALCULATION
  const tripWiseItems = useMemo(() => {
    const tripStats = {};
    filteredBookings.forEach((b) => {
      const trip = b.trip || 'Uncategorized';
      if (!tripStats[trip]) {
        tripStats[trip] = { trip, count: 0, members: 0, revenue: 0, vendorCost: 0, profit: 0 };
      }
      tripStats[trip].count++;
      tripStats[trip].members += b.members || 0;
      tripStats[trip].revenue += b.totalAmount || 0;
      tripStats[trip].vendorCost += b.vendorCost || 0;
      tripStats[trip].profit += b.netProfit || 0;
    });

    return Object.values(tripStats).sort((a, b) => b.profit - a.profit);
  }, [filteredBookings]);

  // Highlights Widget
  const highlights = useMemo(() => {
    if (tripWiseItems.length === 0) return { topProfitTrip: null, mostBookedTrip: null };
    const sortedByProfit = [...tripWiseItems].sort((a, b) => b.profit - a.profit);
    const sortedByBookings = [...tripWiseItems].sort((a, b) => b.count - a.count);
    return {
      topProfitTrip: sortedByProfit[0].profit > 0 ? sortedByProfit[0] : null,
      mostBookedTrip: sortedByBookings[0].count > 0 ? sortedByBookings[0] : null,
    };
  }, [tripWiseItems]);

  // 5. INTERVAL LEDGER CALCULATION (DYNAMIC LEDGER)
  const ledgerItems = useMemo(() => {
    const groups = {};
    filteredBookings.forEach((b) => {
      let key = 'Unknown';
      let dateLabel = 'Unknown';

      if (b.departure) {
        const d = new Date(b.departure);
        if (!isNaN(d.getTime())) {
          const year = String(d.getFullYear());
          if (ledgerGroupBy === 'year') {
            key = year;
            dateLabel = year;
          } else {
            // default 'month'
            const m = d.getMonth() + 1;
            key = `${year}-${String(m).padStart(2, '0')}`;
            dateLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          }
        }
      }

      if (!groups[key]) {
        groups[key] = { label: dateLabel, key, revenue: 0, vendorCost: 0, profit: 0 };
      }
      groups[key].revenue += b.totalAmount || 0;
      groups[key].vendorCost += b.vendorCost || 0;
      groups[key].profit += b.netProfit || 0;
    });

    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [filteredBookings, ledgerGroupBy]);

  // Filtered team totals (for selected members summary)
  const filteredTeamData = useMemo(() => {
    if (!isAdmin || selectedMembers.length === 0) return data;
    const teamWise = data.teamWise.filter((t) => selectedMembers.includes(t.teamMember));
    return { ...data, teamWise };
  }, [data, selectedMembers, isAdmin]);

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-zinc-800 rounded w-64 mb-6"></div>
        <div className="h-32 bg-slate-100 dark:bg-zinc-800 rounded-3xl"></div>
        <div className="h-64 bg-slate-100 dark:bg-zinc-800 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-20">

      {/* Global Filter Dashboard Bar */}
      <div className="bg-white dark:bg-zinc-900/50 p-6 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <IndianRupee className="text-brand-600 dark:text-brand-400" size={26} strokeWidth={2.5} />
              Billing & Analytics
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live updates on costing, revenue, and net profit performance metrics.
            </p>
          </div>
        </div>

        {/* Filters Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2">
          
          {/* Date Range Preset */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Date Interval</span>
            <div className="relative">
              <select
                value={dateRangePreset}
                onChange={(e) => setDateRangePreset(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer appearance-none pr-8 shadow-sm"
              >
                <option value="all">All Time</option>
                <option value="last30">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Year Filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Year</span>
            <div className="relative">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer appearance-none pr-8 shadow-sm"
              >
                <option value="all">All Years</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Month Filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Month</span>
            <div className="relative">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer appearance-none pr-8 shadow-sm"
              >
                {MONTHS_LIST.map((m) => (
                  <option key={m.val} value={m.val}>{m.label}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Trip/Destination Filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Trip / Destination</span>
            <div className="relative">
              <select
                value={filterTrip}
                onChange={(e) => setFilterTrip(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer appearance-none pr-8 shadow-sm"
              >
                <option value="all">All Trips</option>
                {availableTrips.map((trip) => (
                  <option key={trip} value={trip}>{trip}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Team Member Filter — Admin only */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Team Member</span>
            <div className="relative">
              <select
                value={selectedMembers[0] || ''}
                onChange={(e) => setSelectedMembers(e.target.value ? [e.target.value] : [])}
                disabled={!isAdmin}
                className="w-full bg-slate-50 disabled:opacity-60 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer appearance-none pr-8 shadow-sm"
              >
                <option value="">All Team Members</option>
                {allMembers.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

        </div>

        {/* Custom Date Range Picker */}
        {dateRangePreset === 'custom' && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-zinc-800 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Start Date</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">End Date</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-start gap-4 p-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
            <Wallet size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-tight mb-1 font-medium">Gross Revenue</p>
            <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100 leading-none">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
        </div>

        <div className="card flex items-start gap-4 p-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-tight mb-1 font-medium">Net Profit</p>
            <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100 leading-none">
              {formatCurrency(totalProfit)}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1.5 flex items-center gap-1">
              <ArrowUpRight size={12} /> {profitMargin}% Margin
            </p>
          </div>
        </div>

        <div className="card flex items-start gap-4 p-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <Briefcase size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-tight mb-1 font-medium">Supplier Cost</p>
            <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100 leading-none">{formatCurrency(totalCost)}</p>
            <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium mt-1.5 flex items-center gap-1">
              <ArrowDownRight size={12} /> {totalRevenue > 0 ? Math.round((totalCost / totalRevenue) * 100) : 0}% of Rev
            </p>
          </div>
        </div>

        <div className="card flex items-start gap-4 p-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <MapPin size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-tight mb-1 font-medium">Total Bookings</p>
            <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100 leading-none">{totalBookings}</p>
          </div>
        </div>
      </div>

      {/* TRIP-WISE PERFORMANCE LEDGER & HIGHLIGHTS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <MapPin className="text-indigo-500" size={20} /> Trip-wise Ledger
          </h3>
        </div>

        {/* Top Highlights Block */}
        {(highlights.topProfitTrip || highlights.mostBookedTrip) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gradient-to-tr from-brand-500/5 to-teal-500/5 dark:from-brand-950/20 dark:to-teal-950/20 p-4 rounded-xl border border-brand-100/50 dark:border-brand-900/30">
            {highlights.topProfitTrip && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold">
                  <Award size={20} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Top Performing Trip (Highest Profit)</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{highlights.topProfitTrip.trip}</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold ml-2">({formatCurrency(highlights.topProfitTrip.profit)} Profit)</span>
                </div>
              </div>
            )}

            {highlights.mostBookedTrip && (
              <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-200/60 dark:border-zinc-800 pt-3 md:pt-0 md:pl-4">
                <div className="w-10 h-10 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 font-bold">
                  <Users size={20} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Most Booked Trip</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{highlights.mostBookedTrip.trip}</span>
                  <span className="text-xs text-brand-600 dark:text-brand-400 font-bold ml-2">({highlights.mostBookedTrip.count} Bookings)</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="card p-0 overflow-hidden">
          <Table>
            <Thead>
              <Th>Trip / Destination</Th>
              <Th className="text-center">Bookings</Th>
              <Th className="text-center">Travelers</Th>
              <Th className="text-right">Revenue</Th>
              <Th className="text-right">Vendor Cost</Th>
              <Th className="text-right">Net Profit</Th>
            </Thead>
            <Tbody>
              {tripWiseItems.length === 0 ? (
                <Tr><Td colSpan="6" className="text-center text-slate-400 italic py-8">No trip data available.</Td></Tr>
              ) : (
                tripWiseItems.map((trip, i) => (
                  <Tr key={i}>
                    <Td className="font-medium text-slate-800 dark:text-slate-200">{trip.trip}</Td>
                    <Td className="text-center text-slate-600 dark:text-slate-300">{trip.count}</Td>
                    <Td className="text-center text-slate-600 dark:text-slate-300">{trip.members}</Td>
                    <Td className="text-right font-medium text-emerald-700 dark:text-emerald-500">{formatCurrency(trip.revenue)}</Td>
                    <Td className="text-right font-medium text-rose-600 dark:text-rose-400">{formatCurrency(trip.vendorCost)}</Td>
                    <Td className="text-right font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-900/10">{formatCurrency(trip.profit)}</Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </div>
      </section>

      {/* INTERVAL LEDGER & TEAM PERFORMANCE */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* TIME INTERVAL LEDGER (DYNAMIC MONTHLY/YEARLY LEDGER) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
              <CalendarDays className="text-emerald-500" size={20} /> Time Interval Ledger
            </h3>
            
            <select
              value={ledgerGroupBy}
              onChange={(e) => setLedgerGroupBy(e.target.value)}
              className="bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer shadow-sm animate-none"
            >
              <option value="month">Monthly Interval</option>
              <option value="year">Yearly Interval</option>
            </select>
          </div>

          <div className="card p-0 overflow-hidden">
            <Table>
              <Thead>
                <Th>Time Interval</Th>
                <Th className="text-right">Revenue</Th>
                <Th className="text-right">Cost</Th>
                <Th className="text-right">Profit</Th>
              </Thead>
              <Tbody>
                {ledgerItems.length === 0 ? (
                  <Tr>
                    <Td colSpan={4} className="text-center text-slate-400 italic py-8">
                      No ledger data matches filter.
                    </Td>
                  </Tr>
                ) : (
                  ledgerItems.map((item, i) => (
                    <Tr key={item.key || i}>
                      <Td className="font-medium text-slate-800 dark:text-slate-200">{item.label}</Td>
                      <Td className="text-right font-medium text-emerald-700 dark:text-emerald-500">{formatCurrency(item.revenue)}</Td>
                      <Td className="text-right font-medium text-rose-600 dark:text-rose-400">{formatCurrency(item.vendorCost)}</Td>
                      <Td className="text-right font-semibold text-indigo-700 dark:text-indigo-400">{formatCurrency(item.profit)}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </div>
        </section>

        {/* TEAM PERFORMANCE */}
        <section className="space-y-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <Users className="text-amber-500" size={20} /> Team Performance
          </h3>
          <div className="card p-0 overflow-hidden">
            <Table>
              <Thead>
                <Th>Team Member</Th>
                <Th className="text-center">Leads</Th>
                <Th className="text-center">Closed</Th>
                <Th className="text-right">Revenue</Th>
                <Th className="text-right">Profit</Th>
              </Thead>
              <Tbody>
                {filteredTeamData.teamWise.length === 0 ? (
                  <Tr><Td colSpan="5" className="text-center text-slate-400 italic py-8">No team data.</Td></Tr>
                ) : (
                  filteredTeamData.teamWise.map((t, i) => (
                    <Tr key={i}>
                      <Td className="font-medium text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 dark:from-amber-700 dark:to-amber-900 text-amber-900 dark:text-amber-100 flex items-center justify-center text-[11px] uppercase font-bold shadow-sm">
                            {t.teamMember.charAt(0)}
                          </div>
                          {t.teamMember}
                        </div>
                      </Td>
                      <Td className="text-center text-slate-600 dark:text-slate-300">{t.leads}</Td>
                      <Td className="text-center font-medium text-brand-600 dark:text-brand-400">{t.bookingsClosed}</Td>
                      <Td className="text-right font-medium text-emerald-700 dark:text-emerald-500">{formatCurrency(t.revenue)}</Td>
                      <Td className="text-right font-semibold text-indigo-700 dark:text-indigo-400">
                        <div className="flex items-center justify-end gap-1">
                          <TrendingUp size={12} className="text-emerald-500" />
                          {formatCurrency(t.profit)}
                        </div>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </div>
        </section>

      </div>
    </div>
  );
}

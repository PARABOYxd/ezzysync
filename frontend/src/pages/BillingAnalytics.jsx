import React, { useEffect, useState, useMemo } from 'react';
import { IndianRupee, MapPin, CalendarDays, Users, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Briefcase, Filter, X } from 'lucide-react';
import * as dashboardService from '../services/dashboardService';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/common/Table.jsx';

export default function BillingAnalytics() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ tripWise: [], monthWise: [], teamWise: [] });
  const [selectedMembers, setSelectedMembers] = useState([]); // [] = All

  const isAdmin = user?.role !== 'TEAM_MEMBER';

  useEffect(() => {
    dashboardService.getBillingAnalytics()
      .then(setData)
      .catch(() => toast.error('Could not load billing analytics.'))
      .finally(() => setLoading(false));
  }, [toast]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  // All unique team members from teamWise data
  const allMembers = useMemo(() => data.teamWise.map((t) => t.teamMember), [data.teamWise]);

  const toggleMember = (name) => {
    setSelectedMembers((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  };

  const clearFilter = () => setSelectedMembers([]);

  // Filter data based on selected members
  const filteredData = useMemo(() => {
    if (!isAdmin || selectedMembers.length === 0) return data;

    // Filter teamWise
    const teamWise = data.teamWise.filter((t) => selectedMembers.includes(t.teamMember));

    // For tripWise & monthWise: we don't have per-member breakdown
    // So show all (they're already tenant-wide aggregates)
    // But indicate filter is active with a note
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

  // Summary totals (from tripWise for revenue, cost, profit)
  const totalRevenue = data.tripWise.reduce((sum, t) => sum + (t.revenue || 0), 0);
  const totalProfit = data.tripWise.reduce((sum, t) => sum + (t.profit || 0), 0);
  const totalCost = data.tripWise.reduce((sum, t) => sum + (t.vendorCost || 0), 0);
  const totalBookings = data.tripWise.reduce((sum, t) => sum + (t.count || 0), 0);
  const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  // Filtered team totals (for selected members summary)
  const teamRevenue = filteredData.teamWise.reduce((sum, t) => sum + (t.revenue || 0), 0);
  const teamProfit = filteredData.teamWise.reduce((sum, t) => sum + (t.profit || 0), 0);
  const teamBookings = filteredData.teamWise.reduce((sum, t) => sum + (t.bookingsClosed || 0), 0);

  const isFiltered = isAdmin && selectedMembers.length > 0;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-20">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <IndianRupee className="text-brand-600 dark:text-brand-400" size={26} strokeWidth={2.5} />
            Billing & Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isFiltered
              ? `Showing data for: ${selectedMembers.join(', ')}`
              : 'Deep dive into your financial health and team performance.'}
          </p>
        </div>

        {/* Team Member Filter — Admin only */}
        {isAdmin && allMembers.length > 0 && (
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Filter by Team Member</span>
              {isFiltered && (
                <button
                  onClick={clearFilter}
                  className="flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-600 font-medium"
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 max-w-xs">
              {allMembers.map((name) => {
                const active = selectedMembers.includes(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleMember(name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                      active
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm shadow-brand-500/20'
                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:border-brand-400 hover:text-brand-600'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-start gap-4 p-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
            <Wallet size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-tight mb-1 font-medium">Gross Revenue</p>
            <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100 leading-none">
              {isFiltered ? formatCurrency(teamRevenue) : formatCurrency(totalRevenue)}
            </p>
            {isFiltered && <p className="text-[10px] text-slate-400 mt-1">All trips: {formatCurrency(totalRevenue)}</p>}
          </div>
        </div>

        <div className="card flex items-start gap-4 p-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-tight mb-1 font-medium">Net Profit</p>
            <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100 leading-none">
              {isFiltered ? formatCurrency(teamProfit) : formatCurrency(totalProfit)}
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
            <p className="text-xs text-slate-400 leading-tight mb-1 font-medium">
              {isFiltered ? 'Bookings (Selected)' : 'Total Bookings'}
            </p>
            <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100 leading-none">
              {isFiltered ? teamBookings : totalBookings}
            </p>
          </div>
        </div>
      </div>

      {/* TRIP-WISE P&L */}
      <section className="space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
          <MapPin className="text-indigo-500" size={20} /> Trip-wise Ledger
        </h3>
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
              {data.tripWise.length === 0 ? (
                <Tr><Td colSpan="6" className="text-center text-slate-400 italic py-8">No trip data available.</Td></Tr>
              ) : (
                data.tripWise.map((trip, i) => (
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* MONTHLY P&L */}
        <section className="space-y-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <CalendarDays className="text-emerald-500" size={20} /> Monthly Ledger
          </h3>
          <div className="card p-0 overflow-hidden">
            <Table>
              <Thead>
                <Th>Month</Th>
                <Th className="text-right">Revenue</Th>
                <Th className="text-right">Cost</Th>
                <Th className="text-right">Profit</Th>
              </Thead>
              <Tbody>
                {data.monthWise.length === 0 ? (
                  <Tr><Td colSpan="4" className="text-center text-slate-400 italic py-8">No monthly data.</Td></Tr>
                ) : (
                  data.monthWise.map((m, i) => (
                    <Tr key={i}>
                      <Td className="font-medium text-slate-800 dark:text-slate-200">{m.month}</Td>
                      <Td className="text-right font-medium text-emerald-700 dark:text-emerald-500">{formatCurrency(m.revenue)}</Td>
                      <Td className="text-right font-medium text-rose-600 dark:text-rose-400">{formatCurrency(m.vendorCost)}</Td>
                      <Td className="text-right font-semibold text-indigo-700 dark:text-indigo-400">{formatCurrency(m.profit)}</Td>
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
            <Users className="text-amber-500" size={20} />
            Team Performance
            {isFiltered && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-[11px] font-semibold">
                {selectedMembers.length} selected
              </span>
            )}
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
                {filteredData.teamWise.length === 0 ? (
                  <Tr><Td colSpan="5" className="text-center text-slate-400 italic py-8">No data for selected members.</Td></Tr>
                ) : (
                  filteredData.teamWise.map((t, i) => (
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

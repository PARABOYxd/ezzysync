import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Search, MapPin, Users, Eye, FileText, MessageCircle, ArrowUpDown } from 'lucide-react';
import * as bookingService from '../services/bookingService';
import * as invoiceService from '../services/invoiceService';
import * as whatsappService from '../services/whatsappService';
import { useToast } from '../hooks/useToast.jsx';
import { formatDate, formatCurrency } from '../utils/formatters';
import { TravelStatusBadge } from '../components/common/StatusBadge.jsx';
import { SkeletonTableRows } from '../components/common/Skeleton.jsx';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/common/Table.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import BookingViewDrawer from '../components/booking/BookingViewDrawer.jsx';

const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function UpcomingTrips() {
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tripFilter, setTripFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  const [filters, setFilters] = useState({
    status: 'Booked', // Locked to Booked travel status
    trip: '',
    departureFrom: getTodayString(), // Default to today or future
    departureTo: '',
    sort: 'departure_asc', // Sorted by departure date ascending
    page: 1,
    limit: 10,
  });

  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  });

  const [viewingBooking, setViewingBooking] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    bookingService
      .getBookings(filters)
      .then((data) => {
        setBookings(data.bookings || []);
        setPagination(data.pagination || { totalCount: 0, totalPages: 1, currentPage: 1, limit: 10 });
      })
      .catch(() => toast.error('Could not load upcoming trips.'))
      .finally(() => setLoading(false));
  }, [filters, toast]);

  useEffect(load, [load]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters((prev) => ({
      ...prev,
      trip: tripFilter,
      departureFrom: dateFilter || getTodayString(),
      departureTo: dateFilter || '',
      page: 1,
    }));
  };

  const handleReset = () => {
    setTripFilter('');
    setDateFilter('');
    setFilters({
      status: 'Booked',
      trip: '',
      departureFrom: getTodayString(),
      departureTo: '',
      sort: 'departure_asc',
      page: 1,
      limit: 10,
    });
  };

  const handleSendInvoice = async (b) => {
    try {
      await invoiceService.emailInvoice(b.bookingId);
      toast.success(`Invoice emailed to ${b.email}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send invoice.');
    }
  };

  const handleSendWhatsApp = async (b) => {
    try {
      await whatsappService.sendWhatsApp(b.bookingId);
      toast.success('WhatsApp message sent.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'WhatsApp is not configured yet.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <Calendar className="text-brand-600 animate-pulse" size={24} />
            Upcoming Booked Trips
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Track confirmed bookings sorted by departure date in ascending order.
          </p>
        </div>
      </div>

      {/* Glassmorphic Premium Filters */}
      <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Trip Name Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Trip / Itinerary Name
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="e.g. Goa Tour, Bali Adventure..."
                value={tripFilter}
                onChange={(e) => setTripFilter(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-brand-500 font-medium text-slate-700 dark:text-zinc-200 transition"
              />
            </div>
          </div>

          {/* Date Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Departure Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3.5 text-slate-400" size={16} />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-brand-500 font-medium text-slate-700 dark:text-zinc-200 transition"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs px-4 py-3 shadow-md hover:shadow-lg transition duration-200 flex items-center justify-center gap-1.5"
            >
              <Search size={14} /> Filter
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 font-bold rounded-xl text-xs px-4 py-3 transition duration-200"
            >
              Reset
            </button>
          </div>
        </div>
      </form>

      {/* Booked Table Card */}
      <div className="card p-0 overflow-hidden bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm">
        <Table>
          <Thead>
            <Th>Customer</Th>
            <Th>Trip / Package</Th>
            <Th>
              <span className="flex items-center gap-1">
                Departure Date <ArrowUpDown size={12} className="text-brand-500" />
              </span>
            </Th>
            <Th>Pax</Th>
            <Th>Total Price</Th>
            <Th>Pending (₹)</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </Thead>
          <Tbody>
            {loading && <SkeletonTableRows rows={6} cols={8} />}
            {!loading && bookings.map((b) => (
              <Tr key={b.bookingId}>
                <Td>
                  <p className="font-semibold text-slate-800 dark:text-zinc-200">{b.customerName}</p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">{b.phone || b.email || '-'}</p>
                </Td>
                <Td>
                  <p className="font-medium text-slate-700 dark:text-zinc-300">{b.trip}</p>
                  {b.batchName && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-semibold mt-1">
                      Batch: {b.batchName} ({b.batchCustomId})
                    </span>
                  )}
                </Td>
                <Td>
                  <span className="bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 px-2.5 py-1 rounded-lg text-xs font-bold font-mono">
                    {formatDate(b.departure)}
                  </span>
                </Td>
                <Td className="text-slate-600 dark:text-zinc-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Users size={13} className="text-slate-400" /> {b.members}
                  </span>
                </Td>
                <Td className="text-slate-700 dark:text-zinc-300 font-semibold">
                  {formatCurrency(b.totalAmount)}
                </Td>
                <Td>
                  <span className={`font-bold font-mono ${b.remaining > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {formatCurrency(b.remaining)}
                  </span>
                </Td>
                <Td>
                  <TravelStatusBadge status={b.travelStatus} />
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setViewingBooking(b)}
                      className="btn-icon text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handleSendInvoice(b)}
                      className="btn-icon text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
                      title="Email Invoice"
                    >
                      <FileText size={14} />
                    </button>
                    <button
                      onClick={() => handleSendWhatsApp(b)}
                      className="btn-icon text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
                      title="Send WhatsApp Update"
                    >
                      <MessageCircle size={14} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>

        {!loading && bookings.length === 0 && (
          <EmptyState
            title="No Booked Trips Found"
            message="No upcoming booked trips match your active filters."
          />
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && bookings.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm">
          <div>
            Showing <span className="font-semibold text-slate-700 dark:text-zinc-300">{Math.min((filters.page - 1) * filters.limit + 1, pagination.totalCount)}</span> to{' '}
            <span className="font-semibold text-slate-700 dark:text-zinc-300">{Math.min(filters.page * filters.limit, pagination.totalCount)}</span> of{' '}
            <span className="font-semibold text-slate-700 dark:text-zinc-300">{pagination.totalCount}</span> trips
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
              className="btn-secondary px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              Previous
            </button>
            {Array.from({ length: pagination.totalPages }, (_, index) => {
              const p = index + 1;
              return (
                <button
                  key={p}
                  onClick={() => setFilters(prev => ({ ...prev, page: p }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filters.page === p
                      ? 'bg-brand-600 text-white'
                      : 'bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              disabled={filters.page >= pagination.totalPages}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              className="btn-secondary px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Booking View Detail Drawer */}
      <BookingViewDrawer
        open={!!viewingBooking}
        booking={viewingBooking}
        onClose={() => setViewingBooking(null)}
        onRefresh={load}
      />
    </div>
  );
}

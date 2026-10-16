import React, { useEffect, useState } from 'react';
import { Download, Mail, Search } from 'lucide-react';
import * as bookingService from '../services/bookingService';
import * as invoiceService from '../services/invoiceService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { PaymentStatusBadge } from '../components/common/StatusBadge.jsx';
import { SkeletonTableRows } from '../components/common/Skeleton.jsx';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/common/Table.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { usePermission } from '../hooks/usePermission.js';
import Input from '../components/ui/Input.jsx';
import Pagination from '../components/common/Pagination.jsx';
import BookingViewDrawer from '../components/booking/BookingViewDrawer.jsx';

export default function Invoices() {
  const canDownload = usePermission('invoices', 'download');
  const canEmail = usePermission('invoices', 'email');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalCount: 0, totalPages: 1, currentPage: 1, limit: 15 });
  const [viewingBookingId, setViewingBookingId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 400); // 400ms debounce
    return () => clearTimeout(handler);
  }, [searchInput]);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setLoading(true);
    bookingService
      .getBookings({ search: debouncedSearch, departureFrom: todayStr, sort: 'newest', page, limit: 15 })
      .then((res) => {
        setBookings(res.bookings || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      })
      .catch(() => toast.error('Could not load bookings.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page]);

  const handleDownload = async (b) => {
    try {
      const blob = await invoiceService.downloadInvoice(b.bookingId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${b.bookingId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not generate invoice.');
    }
  };

  const handleEmail = async (b) => {
    try {
      await invoiceService.emailInvoice(b.bookingId);
      toast.success(`Invoice emailed to ${b.email}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not email invoice.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="w-full sm:max-w-xs">
        <Input icon={Search} placeholder="Search invoices…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
      </div>

      <div className="card p-0 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <Thead>
              <Th>Customer Name</Th>
              <Th>Phone Number</Th>
              <Th>Trip Name</Th>
              <Th>Pax</Th>
              <Th>Price / Person</Th>
              <Th>Total</Th>
              <Th>Paid</Th>
              <Th>Payment Status</Th>
              <Th className="text-right">Actions</Th>
            </Thead>
            <Tbody>
                {loading && <SkeletonTableRows rows={6} cols={9} />}
                {!loading && bookings.map((b) => (
                  <Tr key={b.bookingId}>
                    <Td>
                      <button
                        onClick={() => setViewingBookingId(b.bookingId)}
                        className="font-medium text-slate-800 dark:text-zinc-200 hover:text-brand-600 dark:hover:text-brand-400 hover:underline text-left cursor-pointer"
                      >
                        {b.customerName}
                      </button>
                    </Td>
                    <Td className="text-slate-500 dark:text-zinc-400 font-mono text-xs">
                      {b.phone || '-'}
                    </Td>
                    <Td className="text-slate-600 dark:text-zinc-300 font-medium">
                      {b.trip}
                    </Td>
                    <Td className="text-slate-600 dark:text-zinc-400">
                      {b.members || 1}
                    </Td>
                    <Td className="text-slate-600 dark:text-zinc-400 font-mono">
                      {formatCurrency(b.pricePerPerson)}
                    </Td>
                    <Td className="text-slate-800 dark:text-zinc-100 font-semibold font-mono">
                      {formatCurrency(b.totalAmount)}
                    </Td>
                    <Td className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                      {formatCurrency(b.paid)}
                    </Td>
                    <Td>
                      <PaymentStatusBadge status={b.paymentStatus} />
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        {canDownload && (
                          <button title="Download PDF" onClick={() => handleDownload(b)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 cursor-pointer">
                            <Download size={16} />
                          </button>
                        )}
                        {canEmail && (
                          <button title="Email Invoice" onClick={() => handleEmail(b)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 cursor-pointer">
                            <Mail size={16} />
                          </button>
                        )}
                        {!canDownload && !canEmail && (
                          <span className="text-xs text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-900 px-2 py-1 rounded">No Access</span>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
            </Tbody>
          </Table>
        </div>

        {/* Mobile Cards View */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
          {loading && (
            <div className="p-6 text-center text-slate-400 text-xs">
              <span className="animate-spin inline-block mr-2">⏳</span> Loading invoices...
            </div>
          )}
          {!loading && bookings.map((b) => (
            <div key={b.bookingId} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => setViewingBookingId(b.bookingId)}
                    className="font-bold text-slate-800 dark:text-zinc-100 text-sm text-left hover:text-brand-600 transition truncate block max-w-full"
                  >
                    {b.customerName}
                  </button>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">{b.phone || '-'}</p>
                  <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium truncate mt-0.5">{b.trip} ({b.members || 1} pax)</p>
                </div>
                <PaymentStatusBadge status={b.paymentStatus} />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs pt-1 bg-slate-50 dark:bg-zinc-800/40 p-2.5 rounded-lg font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Rate / Pax</span>
                  <span className="font-medium text-slate-700 dark:text-zinc-300">{formatCurrency(b.pricePerPerson)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-100">{formatCurrency(b.totalAmount)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Paid</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(b.paid)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100/80 dark:border-zinc-800/80">
                {canDownload && (
                  <button
                    onClick={() => handleDownload(b)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-200 transition min-h-[38px] cursor-pointer"
                  >
                    <Download size={14} /> PDF
                  </button>
                )}
                {canEmail && (
                  <button
                    onClick={() => handleEmail(b)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 text-xs font-semibold hover:bg-brand-100 transition min-h-[38px] cursor-pointer"
                  >
                    <Mail size={14} /> Email
                  </button>
                )}
                <button
                  onClick={() => setViewingBookingId(b.bookingId)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-50 transition min-h-[38px] cursor-pointer"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {!loading && bookings.length === 0 && (
          <EmptyState title="No active invoices found" message="Showing today's and upcoming bookings. Past bookings are excluded." />
        )}
      </div>

      {!loading && (
        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          totalCount={pagination.totalCount}
          limit={pagination.limit}
          itemName="invoices"
          onPageChange={setPage}
          className="mt-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm"
        />
      )}

      <BookingViewDrawer
        open={!!viewingBookingId}
        onClose={() => setViewingBookingId(null)}
        booking={bookings.find(b => b.bookingId === viewingBookingId)}
        onRefresh={() => {
          bookingService
            .getBookings({ search: debouncedSearch, departureFrom: todayStr, sort: 'newest', page, limit: 15 })
            .then((res) => {
              setBookings(res.bookings || []);
              if (res.pagination) setPagination(res.pagination);
            });
        }}
      />
    </div>
  );
}

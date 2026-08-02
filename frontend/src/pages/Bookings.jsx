import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import BookingFilters from '../components/booking/BookingFilters.jsx';
import BookingTable from '../components/booking/BookingTable.jsx';
import BookingFormDrawer from '../components/booking/BookingFormDrawer.jsx';
import BookingViewModal from '../components/booking/BookingViewModal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import * as bookingService from '../services/bookingService';
import * as invoiceService from '../services/invoiceService';
import * as whatsappService from '../services/whatsappService';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Bookings() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '', status: '', trip: '', teamMember: '', sort: 'newest', page: 1, limit: 10,
  });

  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    bookingService
      .getBookings(filters)
      .then((data) => {
        setBookings(data.bookings || []);
        setPagination(data.pagination || { totalCount: 0, totalPages: 1, currentPage: 1, limit: 10 });
      })
      .catch(() => toast.error('Could not load bookings.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(load, [load]);

  const handleExport = async () => {
    try {
      const blob = await bookingService.exportBookingsCSV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bookings.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed.');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await bookingService.deleteBooking(deleteTarget.bookingId);
      toast.success('Booking deleted.');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Could not delete booking.');
    } finally {
      setDeleting(false);
    }
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

  const canCreate = user?.role === 'ADMIN' || user?.permissions?.canCreateLeads !== false;

  const handleFiltersChange = (newFilters) => {
    setFilters({ ...newFilters, page: 1 });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <BookingFilters filters={filters} onChange={handleFiltersChange} onExport={handleExport} />
      </div>
      {canCreate && (
        <div className="flex justify-end">
          <button className="btn-primary" onClick={() => { setEditingBooking(null); setFormOpen(true); }}>
            <Plus size={16} /> Add Booking
          </button>
        </div>
      )}

      <BookingTable
        bookings={bookings}
        loading={loading}
        onView={setViewingBooking}
        onEdit={(b) => { setEditingBooking(b); setFormOpen(true); }}
        onDelete={setDeleteTarget}
        onSendInvoice={handleSendInvoice}
        onSendWhatsApp={handleSendWhatsApp}
      />

      {/* Pagination Controls */}
      {!loading && bookings.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 bg-white p-4 rounded-xl shadow-sm">
          <div>
            Showing <span className="font-semibold text-slate-700">{Math.min((filters.page - 1) * filters.limit + 1, pagination.totalCount)}</span> to{' '}
            <span className="font-semibold text-slate-700">{Math.min(filters.page * filters.limit, pagination.totalCount)}</span> of{' '}
            <span className="font-semibold text-slate-700">{pagination.totalCount}</span> bookings
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
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
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

      <BookingFormDrawer
        open={formOpen}
        booking={editingBooking}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
      <BookingViewModal open={!!viewingBooking} booking={viewingBooking} onClose={() => setViewingBooking(null)} onRefresh={load} />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete booking?"
        message={`This will remove "${deleteTarget?.customerName}"'s booking from the active list. This can be recovered from sheet history if needed.`}
      />
    </div>
  );
}

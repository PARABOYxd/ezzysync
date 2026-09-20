import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import BookingFilters from '../components/booking/BookingFilters.jsx';
import BookingTable from '../components/booking/BookingTable.jsx';
import BookingFormDrawer from '../components/booking/BookingFormDrawer.jsx';
import BookingViewDrawer from '../components/booking/BookingViewDrawer.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Pagination from '../components/common/Pagination.jsx';
import * as bookingService from '../services/bookingService';
import * as invoiceService from '../services/invoiceService';
import * as whatsappService from '../services/whatsappService';
import { useToast } from '../hooks/useToast.jsx';
import { usePermission } from '../hooks/usePermission.js';

export default function Bookings() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '', status: '', trip: '', teamMember: '',
    departureFrom: '', departureTo: '', createdFrom: '', createdTo: '',
    sort: 'newest', page: 1, limit: 10,
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
      const res = await whatsappService.sendWhatsApp(b.bookingId);
      toast.success(res?.message || `Invoice PDF sent to ${b.customerName} on WhatsApp & shared to Live Chat.`);
    } catch (err) {
      const msg = err.response?.data?.message || 'WhatsApp is not connected. Please connect WhatsApp in WhatsApp Live Chat or Settings to send invoices.';
      toast.error(msg);
    }
  };

  const handleShareItinerary = (b) => {
    if (!b.phone) {
      toast.error('This booking has no phone number on file.');
      return;
    }
    navigate(`/whatsapp-chat?phone=${encodeURIComponent(b.phone.replace(/[^\d]/g, ''))}&openItinerary=1`);
  };

  const canCreate = usePermission('bookings', 'create');

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
        onShareItinerary={handleShareItinerary}
      />

      {/* Pagination Controls */}
      {!loading && (
        <Pagination
          currentPage={filters.page}
          totalPages={pagination.totalPages}
          totalCount={pagination.totalCount}
          limit={filters.limit}
          itemName="bookings"
          onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
          className="mt-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm"
        />
      )}

      <BookingFormDrawer
        open={formOpen}
        booking={editingBooking}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
      <BookingViewDrawer open={!!viewingBooking} booking={viewingBooking} onClose={() => setViewingBooking(null)} onRefresh={load} />
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

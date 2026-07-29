import React, { useEffect, useState } from 'react';
import { Download, Mail, Search } from 'lucide-react';
import * as bookingService from '../services/bookingService';
import * as invoiceService from '../services/invoiceService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { PaymentStatusBadge } from '../components/common/StatusBadge.jsx';
import { SkeletonTableRows } from '../components/common/Skeleton.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import Input from '../components/ui/Input.jsx';

export default function Invoices() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const toast = useToast();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 600); // 600ms debounce
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    bookingService
      .getBookings({ search: debouncedSearch, sort: 'newest', limit: 100 })
      .then((res) => setBookings(res.bookings))
      .catch(() => toast.error('Could not load bookings.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

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
      <div className="w-full max-w-xs">
        <Input icon={Search} placeholder="Search bookings…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50/60">
                <th className="py-3 px-4 font-medium">Booking ID</th>
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Trip</th>
                <th className="py-3 px-4 font-medium">Total</th>
                <th className="py-3 px-4 font-medium">Payment</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={6} cols={6} />}
              {!loading && bookings.map((b) => (
                <tr key={b.bookingId} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="py-3 px-4 text-slate-400 font-mono text-xs">{b.bookingId}</td>
                  <td className="py-3 px-4 font-medium text-slate-700">{b.customerName}</td>
                  <td className="py-3 px-4 text-slate-500">{b.trip}</td>
                  <td className="py-3 px-4 text-slate-500">{formatCurrency(b.totalAmount)}</td>
                  <td className="py-3 px-4"><PaymentStatusBadge status={b.paymentStatus} /></td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-1">
                      {user?.role === 'ADMIN' || user?.permissions?.canDownloadInvoice !== false ? (
                        <>
                          <button title="Download PDF" onClick={() => handleDownload(b)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                            <Download size={16} />
                          </button>
                          <button title="Email Invoice" onClick={() => handleEmail(b)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                            <Mail size={16} />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">No Access</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && bookings.length === 0 && (
          <EmptyState title="No bookings to invoice yet" message="Once you create bookings, invoices will be generated from here." />
        )}
      </div>
    </div>
  );
}

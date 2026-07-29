import React from 'react';
import { Eye, Pencil, Trash2, FileText, MessageCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { TravelStatusBadge } from '../common/StatusBadge.jsx';
import { SkeletonTableRows } from '../common/Skeleton.jsx';
import EmptyState from '../common/EmptyState.jsx';

import { useAuth } from '../../hooks/useAuth.jsx';

export default function BookingTable({ bookings, loading, onView, onEdit, onDelete, onSendInvoice, onSendWhatsApp }) {
  const { user } = useAuth();

  const canEdit = user?.role === 'ADMIN' || user?.permissions?.canEditLeads !== false;
  const canDelete = user?.role === 'ADMIN' || user?.permissions?.canDeleteLeads === true;
  const canDownload = user?.role === 'ADMIN' || user?.permissions?.canDownloadInvoice !== false;

  const getFollowUpDisplay = (dateStr) => {
    if (!dateStr) return <span className="text-slate-300">-</span>;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = date < today;
    return (
      <span className={`font-semibold text-xs ${isOverdue ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
        {date.toLocaleDateString('en-IN')}
      </span>
    );
  };

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[950px]">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50/60">
              <th className="py-3 px-4 font-medium">Booking ID</th>
              <th className="py-3 px-4 font-medium">Customer</th>
              <th className="py-3 px-4 font-medium">Trip</th>
              <th className="py-3 px-4 font-medium">Departure</th>
              <th className="py-3 px-4 font-medium">Members</th>
              <th className="py-3 px-4 font-medium">Remaining</th>
              <th className="py-3 px-4 font-medium">Follow-up</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <SkeletonTableRows rows={6} cols={9} />}
            {!loading && bookings.map((b) => (
              <tr key={b.bookingId} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="py-3 px-4 text-slate-400 font-mono text-xs">{b.bookingId}</td>
                <td className="py-3 px-4 font-medium text-slate-700">{b.customerName}</td>
                <td className="py-3 px-4 text-slate-500">{b.trip}</td>
                <td className="py-3 px-4 text-slate-500">{formatDate(b.departure)}</td>
                <td className="py-3 px-4 text-slate-500">{b.members}</td>
                <td className="py-3 px-4 text-slate-500">{formatCurrency(b.remaining)}</td>
                <td className="py-3 px-4">{getFollowUpDisplay(b.nextFollowUpDate)}</td>
                <td className="py-3 px-4"><TravelStatusBadge status={b.travelStatus} /></td>
                <td className="py-3 px-4">
                  <div className="flex justify-end gap-1">
                    <IconBtn title="View" onClick={() => onView(b)}><Eye size={16} /></IconBtn>
                    {canEdit && <IconBtn title="Edit" onClick={() => onEdit(b)}><Pencil size={16} /></IconBtn>}
                    {canDownload && <IconBtn title="Send Invoice" onClick={() => onSendInvoice(b)}><FileText size={16} /></IconBtn>}
                    <IconBtn title="WhatsApp" onClick={() => onSendWhatsApp(b)}><MessageCircle size={16} /></IconBtn>
                    {canDelete && <IconBtn title="Delete" danger onClick={() => onDelete(b)}><Trash2 size={16} /></IconBtn>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && bookings.length === 0 && (
        <EmptyState title="No bookings found" message="Try adjusting your filters, or add a new booking to get started." />
      )}
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-2 rounded-lg hover:bg-slate-100 ${danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-500'}`}
    >
      {children}
    </button>
  );
}

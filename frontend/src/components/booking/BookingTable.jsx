import React from 'react';
import { Eye, Pencil, Trash2, FileText, MessageCircle, Edit2 } from 'lucide-react';
import { formatCurrency, formatDate, formatRelativeDate } from '../../utils/formatters';
import { TravelStatusBadge, FollowUpStatusBadge } from '../common/StatusBadge.jsx';
import { SkeletonTableRows } from '../common/Skeleton.jsx';
import { Table, Thead, Tbody, Tr, Th, Td } from '../common/Table.jsx';
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
      <Table>
        <Thead>
          <Th>Customer</Th>
          <Th>Trip</Th>
          <Th>Departure</Th>
          <Th>Pax</Th>
          <Th>Pending (₹)</Th>
          <Th>Follow-up</Th>
          <Th>Booked On</Th>
          <Th>Status</Th>
          <Th className="text-right">Actions</Th>
        </Thead>
        <Tbody>
          {loading && <SkeletonTableRows rows={6} cols={9} />}
          {!loading && bookings.map((b) => (
            <Tr key={b.bookingId}>
              <Td>
                <p className="font-medium text-slate-700 dark:text-zinc-200">{b.customerName}</p>
                <button
                  onClick={() => (canEdit ? onEdit(b) : onView(b))}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                  title={canEdit ? `Edit ${b.customerName}'s booking` : `View ${b.customerName}'s booking`}
                >
                  {b.phone || '-'}
                </button>
              </Td>
              <Td className="text-slate-500 dark:text-zinc-400">{b.trip}</Td>
              <Td className="text-slate-500 dark:text-zinc-400">{formatDate(b.departure)}</Td>
              <Td className="text-slate-500 dark:text-zinc-400">{b.members}</Td>
              <Td className="text-slate-500 dark:text-zinc-400">{formatCurrency(b.remaining)}</Td>
              <Td>{getFollowUpDisplay(b.nextFollowUpDate)}</Td>
              <Td className="text-slate-500 dark:text-zinc-400 text-xs">{formatRelativeDate(b.bookingTimestamp)}</Td>
              <Td><TravelStatusBadge status={b.travelStatus} /></Td>
              <Td>
                <div className="flex justify-end gap-1">
                  <button onClick={() => onView(b)} className="btn-icon text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300" title="View Booking"><Eye size={14} /></button>
                  {canEdit && (
                    <button onClick={() => onEdit(b)} className="btn-icon text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300" title="Edit Booking">
                      <Edit2 size={14} />
                    </button>
                  )}
                  {canDownload && <button onClick={() => onSendInvoice(b)} className="btn-icon text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300" title="Send Invoice"><FileText size={14} /></button>}
                  <button onClick={() => onSendWhatsApp(b)} className="btn-icon text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300" title="WhatsApp"><MessageCircle size={14} /></button>
                  {canDelete && (
                    <button onClick={() => onDelete(b)} className="btn-icon text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete Booking">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
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

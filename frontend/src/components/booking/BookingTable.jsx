import React from 'react';
import { Eye, Pencil, Trash2, FileText, MessageCircle, Edit2, Compass } from 'lucide-react';
import { formatCurrency, formatDate, formatRelativeDate } from '../../utils/formatters';
import { TravelStatusBadge, FollowUpStatusBadge } from '../common/StatusBadge.jsx';
import { SkeletonTableRows } from '../common/Skeleton.jsx';
import { Table, Thead, Tbody, Tr, Th, Td } from '../common/Table.jsx';
import EmptyState from '../common/EmptyState.jsx';

import { usePermission } from '../../hooks/usePermission.js';

export default function BookingTable({ bookings, loading, onView, onEdit, onDelete, onSendInvoice, onSendWhatsApp, onShareItinerary }) {
  const canEdit = usePermission('bookings', 'update');
  const canDelete = usePermission('bookings', 'delete');
  const canDownload = usePermission('invoices', 'download');

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
      {/* Desktop Table View */}
      <div className="hidden md:block">
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
                    <button onClick={() => onSendWhatsApp(b)} className="btn-icon text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300" title="Send Invoice on WhatsApp"><MessageCircle size={14} /></button>
                    {onShareItinerary && <button onClick={() => onShareItinerary(b)} className="btn-icon text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300" title="Share Itinerary on WhatsApp"><Compass size={14} /></button>}
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
      </div>

      {/* Mobile Touch Card View */}
      <div className="block md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
        {loading && (
          <div className="p-4 space-y-3">
            <div className="h-16 bg-slate-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
            <div className="h-16 bg-slate-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
          </div>
        )}
        {!loading && bookings.map((b) => (
          <div key={b.bookingId} className="p-3.5 space-y-2 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-slate-800 dark:text-zinc-100 truncate">
                  {b.customerName}
                </h4>
                {b.phone && (
                  <a href={`tel:${b.phone}`} className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline block">
                    {b.phone}
                  </a>
                )}
              </div>
              <TravelStatusBadge status={b.travelStatus} />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-zinc-300 pt-1">
              <span className="font-semibold truncate max-w-[200px]">✈️ {b.trip}</span>
              <span className="font-bold text-slate-900 dark:text-white">
                Pending: <span className={Number(b.remaining) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>{formatCurrency(b.remaining)}</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
              <span>Departure: {formatDate(b.departure)}</span>
              <span>{b.members} Traveler{b.members > 1 ? 's' : ''}</span>
            </div>

            {/* Actions Toolbar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-zinc-800/60">
              <div className="text-[10px] text-slate-400">
                {b.nextFollowUpDate && <span>Follow-up: {getFollowUpDisplay(b.nextFollowUpDate)}</span>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => onView(b)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer" title="View">
                  <Eye size={15} />
                </button>
                {canEdit && (
                  <button onClick={() => onEdit(b)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer" title="Edit">
                    <Edit2 size={15} />
                  </button>
                )}
                {canDownload && (
                  <button onClick={() => onSendInvoice(b)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer" title="Email invoice to customer" aria-label="Email invoice to customer">
                    <FileText size={15} />
                  </button>
                )}
                <button onClick={() => onSendWhatsApp(b)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer" title="WhatsApp">
                  <MessageCircle size={15} />
                </button>
                {canDelete && (
                  <button onClick={() => onDelete(b)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer" title="Delete">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
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

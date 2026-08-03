import React from 'react';
import { Eye, Pencil, Trash2, ArrowRightCircle } from 'lucide-react';
import { formatRelativeDate } from '../../utils/formatters';
import { LeadStageBadge } from '../common/StatusBadge.jsx';
import { SkeletonTableRows } from '../common/Skeleton.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function LeadTable({ leads, loading, onView, onEdit, onDelete, onConvert }) {
  const { user } = useAuth();

  const canEdit = user?.role === 'ADMIN' || user?.permissions?.canEditLeads !== false;
  const canDelete = user?.role === 'ADMIN' || user?.permissions?.canDeleteLeads === true;

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
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-left text-xs text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/50">
              <th className="py-3 px-4 font-medium">Customer</th>
              <th className="py-3 px-4 font-medium">Interest</th>
              <th className="py-3 px-4 font-medium">Source</th>
              <th className="py-3 px-4 font-medium">Assigned To</th>
              <th className="py-3 px-4 font-medium">Follow-up</th>
              <th className="py-3 px-4 font-medium">Created</th>
              <th className="py-3 px-4 font-medium">Stage</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <SkeletonTableRows rows={6} cols={8} />}
            {!loading && leads.map((l) => (
              <tr key={l.leadId} className="border-b border-slate-50 dark:border-zinc-800/50 hover:bg-slate-50/60 dark:hover:bg-zinc-800/50">
                <td className="py-3 px-4">
                  <p className="font-medium text-slate-700 dark:text-zinc-200">{l.customerName}</p>
                  <button
                    onClick={() => (canEdit ? onEdit(l) : onView(l))}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                    title={canEdit ? `Edit ${l.customerName}'s lead` : `View ${l.customerName}'s lead`}
                  >
                    {l.phone || '-'}
                  </button>
                </td>
                <td className="py-3 px-4 text-slate-500 dark:text-zinc-400">{l.interest || '-'}</td>
                <td className="py-3 px-4 text-slate-500 dark:text-zinc-400">{l.source}</td>
                <td className="py-3 px-4 text-slate-500 dark:text-zinc-400">{l.assignedTo || '-'}</td>
                <td className="py-3 px-4">{getFollowUpDisplay(l.nextFollowUpDate)}</td>
                <td className="py-3 px-4 text-slate-500 dark:text-zinc-400 text-xs">{formatRelativeDate(l.createdAt)}</td>
                <td className="py-3 px-4"><LeadStageBadge stage={l.stage} /></td>
                <td className="py-3 px-4">
                  <div className="flex justify-end gap-1">
                    <IconBtn title="View" onClick={() => onView(l)}><Eye size={16} /></IconBtn>
                    {canEdit && <IconBtn title="Edit" onClick={() => onEdit(l)}><Pencil size={16} /></IconBtn>}
                    {canEdit && l.stage !== 'Won' && !l.convertedBookingId && (
                      <IconBtn title="Convert to Booking" onClick={() => onConvert(l)}><ArrowRightCircle size={16} /></IconBtn>
                    )}
                    {canDelete && <IconBtn title="Delete" danger onClick={() => onDelete(l)}><Trash2 size={16} /></IconBtn>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && leads.length === 0 && (
        <EmptyState title="No leads found" message="Try adjusting your filters, or add a new lead to get started." />
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

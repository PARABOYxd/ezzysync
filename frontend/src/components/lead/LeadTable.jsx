import React from 'react';
import { Eye, Pencil, Trash2, ArrowRightCircle, Edit2 } from 'lucide-react';
import { formatRelativeDate } from '../../utils/formatters';
import { LeadStageBadge, FollowUpStatusBadge } from '../common/StatusBadge.jsx';
import { SkeletonTableRows } from '../common/Skeleton.jsx';
import { Table, Thead, Tbody, Tr, Th, Td } from '../common/Table.jsx';
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
      <Table>
        <Thead>
          <Th>Customer</Th>
          <Th>Interest</Th>
          <Th>Source</Th>
          <Th>Assigned To</Th>
          <Th>Follow-up</Th>
          <Th>Created</Th>
          <Th>Stage</Th>
          <Th className="text-right">Actions</Th>
        </Thead>
        <Tbody>
          {loading && <SkeletonTableRows rows={6} cols={8} />}
          {!loading && leads.map((l) => (
            <Tr key={l.leadId}>
              <Td>
                <p className="font-medium text-slate-700 dark:text-zinc-200">{l.customerName}</p>
                <button
                  onClick={() => (canEdit ? onEdit(l) : onView(l))}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                  title={canEdit ? `Edit ${l.customerName}'s lead` : `View ${l.customerName}'s lead`}
                >
                  {l.phone || '-'}
                </button>
              </Td>
              <Td className="text-slate-500 dark:text-zinc-400">{l.interest || '-'}</Td>
              <Td className="text-slate-500 dark:text-zinc-400">{l.source}</Td>
              <Td className="text-slate-500 dark:text-zinc-400">{l.assignedTo || '-'}</Td>
              <Td>{getFollowUpDisplay(l.nextFollowUpDate)}</Td>
              <Td className="text-slate-500 dark:text-zinc-400 text-xs">{formatRelativeDate(l.createdAt)}</Td>
              <Td><LeadStageBadge stage={l.stage} /></Td>
              <Td>
                <div className="flex justify-end gap-1">
                  {canEdit && (
                    <button onClick={() => onEdit(l)} className="btn-icon text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300" title="Edit Lead">
                      <Edit2 size={14} />
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => onDelete(l)} className="btn-icon text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete Lead">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
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

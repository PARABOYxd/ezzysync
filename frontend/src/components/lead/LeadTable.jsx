import React from 'react';
import { Eye, Pencil, Trash2, ArrowRightCircle, Edit2 } from 'lucide-react';
import { formatRelativeDate } from '../../utils/formatters';
import { LeadStageBadge, LeadPriorityBadge, FollowUpStatusBadge } from '../common/StatusBadge.jsx';
import { SkeletonTableRows } from '../common/Skeleton.jsx';
import { Table, Thead, Tbody, Tr, Th, Td } from '../common/Table.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function LeadTable({ leads, loading, onView, onEdit, onDelete, onConvert, selectedIds, onToggleSelect, onToggleSelectAll }) {
  const { user } = useAuth();
  const isTeamMember = user?.role === 'TEAM_MEMBER';
  const canEdit = usePermission('leads', 'update');
  const canDelete = usePermission('leads', 'delete');
  const showSelection = !!selectedIds;
  const allSelected = showSelection && leads.length > 0 && leads.every((l) => selectedIds.has(l.leadId));

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
            {showSelection && (
              <Th className="w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onToggleSelectAll(leads.map((l) => l.leadId), !allSelected)}
                  className="rounded text-brand-600 focus:ring-brand-500/20 border-slate-300"
                />
              </Th>
            )}
            <Th>Customer</Th>
            <Th>Interest</Th>
            {!isTeamMember && <Th>Source</Th>}
            {!isTeamMember && <Th>Assigned To</Th>}
            <Th>Follow-up</Th>
            <Th>Created</Th>
            <Th>Priority</Th>
            <Th>Stage</Th>
            <Th className="text-right">Actions</Th>
          </Thead>
          <Tbody>
            {loading && <SkeletonTableRows rows={6} cols={(isTeamMember ? 7 : 9) + (showSelection ? 1 : 0)} />}
            {!loading && leads.map((l) => (
              <Tr key={l.leadId}>
                {showSelection && (
                  <Td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(l.leadId)}
                      onChange={() => onToggleSelect(l.leadId)}
                      className="rounded text-brand-600 focus:ring-brand-500/20 border-slate-300"
                    />
                  </Td>
                )}
                <Td>
                  <p className="font-medium text-slate-700 dark:text-zinc-200">{l.customerName || 'New Inquiry'}</p>
                  <button
                    onClick={() => (canEdit ? onEdit(l) : onView(l))}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                    title={canEdit ? `Edit ${l.customerName || 'New Inquiry'}'s lead` : `View ${l.customerName || 'New Inquiry'}'s lead`}
                  >
                    {l.phone || '-'}
                  </button>
                </Td>
                <Td className="text-slate-500 dark:text-zinc-400">
                  <span className="font-medium text-slate-700 dark:text-zinc-300">{l.interest || '-'}</span>
                  {(l.departureDate || l.travelers) && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      {l.departureDate && <span>📅 {l.departureDate}</span>}
                      {l.travelers && <span>👥 {l.travelers} pax</span>}
                    </div>
                  )}
                </Td>
                {!isTeamMember && <Td className="text-slate-500 dark:text-zinc-400">{l.source}</Td>}
                {!isTeamMember && <Td className="text-slate-500 dark:text-zinc-400">{l.assignedTo || '-'}</Td>}
                <Td>{getFollowUpDisplay(l.nextFollowUpDate)}</Td>
                <Td className="text-slate-500 dark:text-zinc-400 text-xs">{formatRelativeDate(l.createdAt)}</Td>
                <Td><LeadPriorityBadge priority={l.priority} /></Td>
                <Td><LeadStageBadge stage={l.stage} /></Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => onView(l)} className="btn-icon text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300" title="View Lead">
                      <Eye size={14} />
                    </button>
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
      </div>

      {/* Mobile Touch Card View */}
      <div className="block md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
        {loading && (
          <div className="p-4 space-y-3">
            <div className="h-16 bg-slate-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
            <div className="h-16 bg-slate-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
            <div className="h-16 bg-slate-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
          </div>
        )}
        {!loading && leads.map((l) => (
          <div key={l.leadId} className="p-3.5 space-y-2 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                {showSelection && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(l.leadId)}
                    onChange={() => onToggleSelect(l.leadId)}
                    className="mt-1 rounded text-brand-600 focus:ring-brand-500/20 border-slate-300"
                  />
                )}
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-zinc-100 truncate">
                    {l.customerName || 'New Inquiry'}
                  </h4>
                  {l.phone && (
                    <a
                      href={`tel:${l.phone}`}
                      className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline block"
                    >
                      {l.phone}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <LeadPriorityBadge priority={l.priority} />
                <LeadStageBadge stage={l.stage} />
              </div>
            </div>

            {/* Trip interest & metadata */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 pt-1">
              <span className="font-medium truncate max-w-[200px]">
                {l.interest || 'No destination specified'}
              </span>
              <span className="text-[11px] text-slate-400 shrink-0">
                {formatRelativeDate(l.createdAt)}
              </span>
            </div>

            {/* Mobile Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-zinc-800/60">
              <div className="text-[11px] text-slate-400">
                {l.source && <span className="mr-2">Via {l.source}</span>}
                {l.nextFollowUpDate && <span>Follow-up: {getFollowUpDisplay(l.nextFollowUpDate)}</span>}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onView(l)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                  title="View Lead"
                >
                  <Eye size={16} />
                </button>
                {canEdit && (
                  <button
                    onClick={() => onEdit(l)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                    title="Edit Lead"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => onDelete(l)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                    title="Delete Lead"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
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

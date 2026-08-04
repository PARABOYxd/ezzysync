import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Layers, MapPin, Calendar, Users, Edit2, Trash2 } from 'lucide-react';
import * as batchService from '../services/batchService';
import { useToast } from '../hooks/useToast.jsx';
import { usePermission } from '../hooks/usePermission.js';
import { formatDate } from '../utils/formatters';
import Input from '../components/ui/Input.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import BatchFormModal from '../components/batch/BatchFormModal.jsx';
import BatchDetailDrawer from '../components/batch/BatchDetailDrawer.jsx';

function departureLabelFor(departureDate) {
  const daysLeft = Math.ceil((new Date(departureDate) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (Number.isNaN(daysLeft)) return null;
  if (daysLeft > 0) return { text: `In ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, tone: daysLeft <= 7 ? 'warning' : 'brand' };
  if (daysLeft === 0) return { text: 'Today', tone: 'warning' };
  return { text: 'Departed', tone: 'muted' };
}

const CHIP_TONE = {
  brand: 'bg-[var(--primary)]/10 text-[var(--primary)]',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning)]',
  muted: 'bg-slate-100 dark:bg-zinc-800 text-[var(--text-secondary)]',
};

function BatchCard({ b, onOpen, onEdit, onDelete, canEdit, canDelete }) {
  const departure = departureLabelFor(b.departureDate);

  const activate = () => onOpen(b.batchId);
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${b.tripName} batch details`}
      onClick={activate}
      onKeyDown={onKeyDown}
      className="card group flex flex-col justify-between gap-4 cursor-pointer
        hover:shadow-card hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-zinc-700
        transition-all duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center group-hover:bg-[var(--primary)]/15 transition-colors duration-200">
            <MapPin size={18} strokeWidth={1.75} />
          </div>
          <div className="min-w-0 pt-0.5">
            <h4 className="font-semibold text-[var(--text-primary)] text-[15px] leading-snug truncate">{b.tripName}</h4>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mt-1">
              <Calendar size={12} strokeWidth={1.75} />
              <span>{formatDate(b.departureDate)}</span>
              {departure && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${CHIP_TONE[departure.tone]}`}>
                  {departure.text}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 bg-[var(--surface-muted)] rounded-xl p-3.5 border border-[var(--border)]/60">
          <div className="flex justify-between items-baseline text-xs font-semibold text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5"><Users size={13} strokeWidth={1.75} /> Seats filled</span>
            <span className="text-[var(--text-primary)] tabular-nums">{b.confirmedSeats}<span className="text-[var(--text-secondary)] font-normal"> / {b.totalCapacity}</span></span>
          </div>
          <ProgressBar value={b.confirmedSeats} max={b.totalCapacity} showLabel />
          <p className="text-[11px] text-[var(--text-secondary)]">{b.linkedBookingsCount} booking{b.linkedBookingsCount !== 1 ? 's' : ''} linked</p>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-3">
        {canEdit && (
          <button
            onClick={(e) => onEdit(b, e)}
            title="Edit batch"
            aria-label="Edit batch"
            className="w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--text-secondary)]
              hover:bg-slate-200/70 dark:hover:bg-zinc-700 active:bg-slate-300/70 dark:active:bg-zinc-600
              transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <Edit2 size={16} strokeWidth={1.75} />
          </button>
        )}
        {canDelete && (
          <button
            onClick={(e) => onDelete(b, e)}
            title="Delete batch"
            aria-label="Delete batch"
            className="w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--danger-bg)] text-[var(--danger)]
              hover:bg-red-100 dark:hover:bg-red-950/40 active:bg-red-200 dark:active:bg-red-950/60
              transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
          >
            <Trash2 size={16} strokeWidth={1.75} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function TourBatches() {
  const canCreate = usePermission('tourBatches', 'create');
  const canEdit = usePermission('tourBatches', 'update');
  const canDelete = usePermission('tourBatches', 'delete');
  const [searchParams, setSearchParams] = useSearchParams();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [activeBatchId, setActiveBatchId] = useState(searchParams.get('open') || null);
  const toast = useToast();

  // Deep-link support: /tour-batches?open=<batchId>, used by the Quotations
  // page's "Used In" links to jump straight to a batch's roster.
  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId) setActiveBatchId(openId);
  }, [searchParams]);

  const closeDetail = () => {
    setActiveBatchId(null);
    if (searchParams.get('open')) {
      searchParams.delete('open');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const load = () => {
    setLoading(true);
    batchService.getBatches()
      .then(setBatches)
      .catch(() => toast.error('Could not load tour batches.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = batches.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return b.name.toLowerCase().includes(q) || b.tripName.toLowerCase().includes(q) || b.batchId.toLowerCase().includes(q);
  });

  const openCreate = () => {
    setEditingBatch(null);
    setFormOpen(true);
  };

  const openEdit = (b, e) => {
    e.stopPropagation();
    setEditingBatch(b);
    setFormOpen(true);
  };

  const handleDelete = async (b, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete batch "${b.tripName}"? Linked bookings will remain but lose this batch link visibility.`)) return;
    try {
      await batchService.deleteBatch(b.batchId);
      toast.success('Tour batch deleted.');
      load();
    } catch {
      toast.error('Could not delete tour batch.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Group Tours</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Fixed-departure batches with a shared itinerary, date and seat capacity.</p>
        </div>
        {canCreate && (
          <button className="btn-primary h-11 px-4" onClick={openCreate}>
            <Plus size={16} strokeWidth={2} /> Create Batch
          </button>
        )}
      </div>

      <div className="w-full sm:max-w-xs">
        <Input
          icon={Search}
          placeholder="Search batches by name or trip…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading tour batches">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card space-y-4">
              <div className="flex items-start gap-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
              <div className="skeleton h-16 rounded-xl" />
              <div className="flex justify-end gap-2 pt-2">
                <div className="skeleton w-11 h-11 rounded-lg" />
                <div className="skeleton w-11 h-11 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 bg-[var(--surface-muted)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto text-[var(--text-secondary)]">
            <Layers size={24} strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">
              {search ? 'No batches match your search' : 'No tour batches yet'}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
              {search
                ? 'Try a different name or trip keyword.'
                : 'Group multiple bookings under one fixed-departure tour with a shared itinerary, price and seat capacity.'}
            </p>
          </div>
          {!search && canCreate && (
            <button className="btn-primary h-11 px-4 mx-auto" onClick={openCreate}>
              <Plus size={16} strokeWidth={2} /> Create First Batch
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((b) => (
            <BatchCard key={b.batchId} b={b} onOpen={setActiveBatchId} onEdit={openEdit} onDelete={handleDelete} canEdit={canEdit} canDelete={canDelete} />
          ))}
        </div>
      )}

      <BatchFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        batch={editingBatch}
      />

      <BatchDetailDrawer
        open={!!activeBatchId}
        onClose={closeDetail}
        batchId={activeBatchId}
        onChanged={load}
      />
    </div>
  );
}

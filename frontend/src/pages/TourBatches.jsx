import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Layers, MapPin, Calendar, Users, IndianRupee, Edit2, Trash2 } from 'lucide-react';
import * as batchService from '../services/batchService';
import { useToast } from '../hooks/useToast.jsx';
import { formatCurrency, formatDate } from '../utils/formatters';
import { BatchStatusBadge } from '../components/common/StatusBadge.jsx';
import Input from '../components/ui/Input.jsx';
import BatchFormModal from '../components/batch/BatchFormModal.jsx';
import BatchDetailDrawer from '../components/batch/BatchDetailDrawer.jsx';

export default function TourBatches() {
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
    if (!window.confirm(`Delete batch "${b.name}"? Linked bookings will remain but lose this batch link visibility.`)) return;
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
        <div className="w-full sm:max-w-xs">
          <Input
            icon={Search}
            placeholder="Search batches by name or trip…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Create Batch
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Layers size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">No tour batches yet</h3>
            <p className="text-xs text-slate-400 mt-1">Group multiple bookings under one fixed-departure tour with a shared itinerary, price and seat capacity.</p>
          </div>
          <button className="btn-primary mx-auto" onClick={openCreate}>
            <Plus size={16} /> Create First Batch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((b) => {
            const pct = Math.min(100, Math.round((b.confirmedSeats / (b.totalCapacity || 1)) * 100));
            return (
              <div
                key={b.batchId}
                onClick={() => setActiveBatchId(b.batchId)}
                className="card flex flex-col justify-between hover:shadow-md transition duration-200 cursor-pointer"
              >
                <div className="space-y-3.5">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 text-[15px] truncate">{b.name}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={12} /> {b.tripName}</p>
                    </div>
                    <BatchStatusBadge status={b.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400" /> {formatDate(b.departureDate)}</div>
                    <div className="flex items-center gap-1.5"><IndianRupee size={12} className="text-slate-400" /> {formatCurrency(b.pricePerPerson)}/pp</div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span className="flex items-center gap-1"><Users size={12} /> Capacity</span>
                      <span>{b.confirmedSeats} / {b.totalCapacity}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-brand-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 font-mono">{b.batchId} &middot; {b.linkedBookingsCount} booking{b.linkedBookingsCount !== 1 ? 's' : ''} linked</p>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-50 pt-3.5 mt-4">
                  <button
                    onClick={(e) => openEdit(b, e)}
                    className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
                    title="Edit Batch"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(b, e)}
                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                    title="Delete Batch"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
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

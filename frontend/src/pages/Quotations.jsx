import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Copy, Check, Trash2, Edit, Layers } from 'lucide-react';
import * as quotationService from '../services/quotationService';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../hooks/useToast.jsx';
import QuotationFormModal from '../components/quotation/QuotationFormModal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import { QuotationStatusBadge } from '../components/common/StatusBadge.jsx';
import Input from '../components/ui/Input.jsx';

export default function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const [filters, setFilters] = useState({
    search: '', status: '', page: 1, limit: 10,
  });

  const [pagination, setPagination] = useState({
    totalCount: 0, totalPages: 1, currentPage: 1, limit: 10,
  });

  const [searchInput, setSearchInput] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    quotationService
      .getQuotations(filters)
      .then((data) => {
        setQuotations(data.quotations || []);
        setPagination(data.pagination || { totalCount: 0, totalPages: 1, currentPage: 1, limit: 10 });
      })
      .catch(() => toast.error('Could not load quotations.'))
      .finally(() => setLoading(false));
  }, [filters, toast]);

  useEffect(load, [load]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters((prev) => {
        if (prev.search === searchInput) return prev;
        return { ...prev, search: searchInput, page: 1 };
      });
    }, 600);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const copyPreviewLink = (uuid, qId) => {
    const link = `${window.location.origin}/app/quote-preview/${uuid}`;
    navigator.clipboard.writeText(link);
    setCopiedId(qId);
    toast.success('Preview link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await quotationService.deleteQuotation(deleteTarget.quotationId);
      toast.success('Quotation deleted.');
      load();
      setDeleteTarget(null);
    } catch {
      toast.error('Could not delete quotation.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="w-full sm:max-w-xs">
          <Input
            icon={Search}
            placeholder="Search quotations…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditingQuotation(null);
            setFormOpen(true);
          }}
        >
          <Plus size={16} /> Create Quotation / Itinerary
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50/60">
                <th className="py-3 px-4 font-medium">Quote ID</th>
                <th className="py-3 px-4 font-medium">Trip & Package</th>
                <th className="py-3 px-4 font-medium">Quote Price</th>
                <th className="py-3 px-4 font-medium">Used In</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <span className="loading loading-spinner text-slate-400" /> Loading itineraries...
                  </td>
                </tr>
              )}
              {!loading && quotations.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No quotations found. Click "Create Quotation" to draft your first day-by-day plan.
                  </td>
                </tr>
              )}
              {!loading &&
                quotations.map((q) => (
                  <tr key={q.quotationId} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{q.quotationId}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-700">{q.tripName}</div>
                      <div className="text-[10px] text-brand-600 font-semibold">{q.itineraryDays?.length || 0} Days Plan</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{formatCurrency(q.priceQuote)}</td>
                    <td className="py-3.5 px-4">
                      {q.usedInBatches?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {q.usedInBatches.map((b) => (
                            <button
                              key={b.batchId}
                              onClick={() => navigate(`/tour-batches?open=${b.batchId}`)}
                              className="flex items-center gap-1 bg-brand-50 hover:bg-brand-100 text-brand-700 px-2 py-1 rounded-lg text-[10px] font-semibold transition"
                              title={`Open ${b.name} in Group Tours`}
                            >
                              <Layers size={10} /> {b.name} &middot; {b.confirmedSeats}/{b.totalCapacity} pax
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-300">Not used in any batch</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => copyPreviewLink(q.id, q.quotationId)}
                          className="btn-icon text-slate-400 hover:text-slate-700"
                          title="Copy public itinerary link for client review"
                        >
                          {copiedId === q.quotationId ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                        <button
                          onClick={() => {
                            setEditingQuotation(q);
                            setFormOpen(true);
                          }}
                          className="btn-icon text-slate-400 hover:text-slate-700"
                          title="Edit itinerary"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(q)}
                          className="btn-icon text-red-500 hover:bg-red-50"
                          title="Delete quotation"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {!loading && quotations.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-slate-50 text-xs text-slate-500 bg-white">
            <div>
              Showing <span className="font-semibold text-slate-700">{Math.min((filters.page - 1) * filters.limit + 1, pagination.totalCount)}</span> to{' '}
              <span className="font-semibold text-slate-700">{Math.min(filters.page * filters.limit, pagination.totalCount)}</span> of{' '}
              <span className="font-semibold text-slate-700">{pagination.totalCount}</span> quotations
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                className="btn-secondary px-2.5 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                Previous
              </button>
              {Array.from({ length: pagination.totalPages }, (_, idx) => {
                const p = idx + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setFilters((prev) => ({ ...prev, page: p }))}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${filters.page === p
                        ? 'bg-brand-600 text-white'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                      }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                disabled={filters.page >= pagination.totalPages}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="btn-secondary px-2.5 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <QuotationFormModal
        open={formOpen}
        quotation={editingQuotation}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete quotation?"
        message={`This will delete the itinerary for "${deleteTarget?.customerName}". This action cannot be undone.`}
      />
    </div>
  );
}

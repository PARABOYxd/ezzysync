import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Copy, Check, Trash2, Edit, Files, MapPin } from 'lucide-react';
import * as quotationService from '../services/quotationService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../hooks/useToast.jsx';
import { usePermission } from '../hooks/usePermission.js';
import QuotationFormModal from '../components/quotation/QuotationFormModal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import { QuotationStatusBadge } from '../components/common/StatusBadge.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Input from '../components/ui/Input.jsx';
import { API_BASE_URL } from '../services/api';

const getItineraryImage = (bannerUrl) => {
  if (bannerUrl) {
    if (bannerUrl.includes('/uploads/')) {
      const relativePath = bannerUrl.substring(bannerUrl.indexOf('/uploads/'));
      const backendRoot = API_BASE_URL.replace('/api', '');
      return `${backendRoot}${relativePath}`;
    }
    return bannerUrl;
  }
  // Default gorgeous nature cover image
  return 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80';
};

export default function Quotations() {
  const canCreate = usePermission('quotations', 'create');
  const canEdit = usePermission('quotations', 'update');
  const canDelete = usePermission('quotations', 'delete');
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const [filters, setFilters] = useState({
    search: '', status: '', page: 1, limit: 250,
  });

  const [pagination, setPagination] = useState({
    totalCount: 0, totalPages: 1, currentPage: 1, limit: 250,
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
    const link = `${window.location.origin}/quote-preview/${uuid}`;
    navigator.clipboard.writeText(link);
    setCopiedId(qId);
    toast.success('Preview link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDuplicate = (quotationId) => {
    const q = quotations.find(qt => qt.quotationId === quotationId);
    if (!q) return;

    const duplicated = {
      ...q,
      tripName: `${q.tripName} - Copy`,
    };
    
    // Remove identifiers so it's treated as a new record
    delete duplicated.id;
    delete duplicated.quotationId;
    delete duplicated.createdAt;
    delete duplicated.updatedAt;

    setEditingQuotation(duplicated);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await quotationService.deleteQuotation(deleteTarget.quotationId);
      toast.success('Quotation deleted.');
      load();
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete quotation.');
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
        {canCreate && (
          <button
            className="btn-primary"
            onClick={() => {
              setEditingQuotation(null);
              setFormOpen(true);
            }}
          >
            <Plus size={16} /> Create Quotation / Itinerary
          </button>
        )}
      </div>

      {/* ── CARD GRID LAYOUT ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm h-72">
              <div className="bg-slate-100 dark:bg-zinc-800 w-full aspect-[4/3]" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-100 dark:bg-zinc-800 rounded w-2/3" />
                <div className="h-3 bg-slate-100 dark:bg-zinc-800 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : quotations.length === 0 ? (
        <EmptyState
          title="No itineraries found"
          message="Click 'Create Quotation / Itinerary' to draft your first day-by-day plan."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {quotations.map((q) => {
              const nights = q.itineraryDays?.length > 1 ? q.itineraryDays.length - 1 : 0;
              const durationText = `${q.itineraryDays?.length || 1}D${nights > 0 ? ` / ${nights}N` : ''}`;
              return (
                <div key={q.quotationId} className="group relative flex flex-col bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 min-h-[250px] max-w-[270px] w-full mx-auto sm:mx-0">
                  
                  {/* Card Cover Image (Uses banner_url if uploaded, falls back to default nature photo) */}
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-zinc-800 border-b border-slate-100 dark:border-zinc-800/60">
                    <img
                      src={getItineraryImage(q.bannerUrl)}
                      alt={q.tripName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-slate-800 dark:text-zinc-100 text-xs truncate flex-1" title={q.tripName}>
                          {q.tripName}
                        </h4>
                        <span className="text-[9px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 px-1.5 py-0.5 rounded shrink-0">
                          {durationText}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Solid Footer Strip (Actions on left, Price on right) */}
                  <div className="bg-brand-600 dark:bg-brand-700 px-3 py-2 flex justify-between items-center text-white text-xs font-bold border-t border-brand-500/10">
                    
                    {/* Embedded Action Icon Buttons (white icons with subtle background hover) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => copyPreviewLink(q.id, q.quotationId)}
                        className="p-1 rounded hover:bg-white/10 text-white/90 hover:text-white transition"
                        title="Copy public link"
                      >
                        {copiedId === q.quotationId ? (
                          <Check size={13} className="text-emerald-300" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                      {canCreate && (
                        <button
                          onClick={() => handleDuplicate(q.quotationId)}
                          className="p-1 rounded hover:bg-white/10 text-white/90 hover:text-white transition"
                          title="Duplicate"
                        >
                          <Files size={13} />
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditingQuotation(q);
                            setFormOpen(true);
                          }}
                          className="p-1 rounded hover:bg-white/10 text-white/90 hover:text-white transition"
                          title="Edit"
                        >
                          <Edit size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteTarget(q)}
                          className="p-1 rounded hover:bg-rose-600/30 text-rose-200 hover:text-rose-100 transition"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* Price Quote */}
                    <span className="text-xs font-extrabold font-mono shrink-0">
                      {formatCurrency(q.priceQuote)}
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      <QuotationFormModal
        open={formOpen}
        quotation={editingQuotation}
        allQuotations={quotations}
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

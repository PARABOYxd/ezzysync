import React, { useEffect, useState, useCallback } from 'react';
import { copyText } from '../utils/clipboard.js';
import { Plus, Search, Copy, Check, Trash2, Edit, Files, CheckCircle } from 'lucide-react';
import * as quotationService from '../services/quotationService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../hooks/useToast.jsx';
import { usePermission } from '../hooks/usePermission.js';
import QuotationFormModal from '../components/quotation/QuotationFormModal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import { QuotationStatusBadge } from '../components/common/StatusBadge.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Pagination from '../components/common/Pagination.jsx';
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
    search: '', status: '', page: 1, limit: 20,
  });

  const [pagination, setPagination] = useState({
    totalCount: 0, totalPages: 1, currentPage: 1, limit: 20,
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
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const copyPreviewLink = async (uuid, qId) => {
    const link = `${window.location.origin}/quote-preview/${uuid}`;
    if (!(await copyText(link))) {
      toast.error(`Could not copy automatically. The link is: ${link}`);
      return;
    }
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

  const [convertingId, setConvertingId] = useState(null);

  // The customer confirming by phone/in person has no other way to become a
  // booking - previously only the emailed public preview link could accept a
  // quotation, so an agent had to re-key the whole itinerary into a brand
  // new Booking by hand. Safe to click more than once: the backend re-syncs
  // the same booking rather than creating a second one.
  const handleConvertToBooking = async (q) => {
    setConvertingId(q.quotationId);
    try {
      await quotationService.acceptQuotation(q.quotationId);
      toast.success(`Booking created/updated from "${q.tripName}".`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not convert this quotation to a booking.');
    } finally {
      setConvertingId(null);
    }
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm h-72">
              <div className="bg-slate-100 dark:bg-zinc-800 w-full aspect-[16/10]" />
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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
            {quotations.map((q) => {
              const nights = q.itineraryDays?.length > 1 ? q.itineraryDays.length - 1 : 0;
              const durationText = `${q.itineraryDays?.length || 1}D${nights > 0 ? ` / ${nights}N` : ''}`;
              const iconBtn = 'h-9 flex-1 flex items-center justify-center rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-800 dark:hover:text-zinc-100 transition disabled:opacity-50 cursor-pointer';
              return (
                <div key={q.quotationId} className="group flex flex-col bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Cover, with how long the trip is and where the quote stands */}
                  <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-zinc-800">
                    <img
                      src={getItineraryImage(q.bannerUrl)}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-2.5 left-2.5 text-[11px] font-bold text-white bg-black/55 backdrop-blur-sm px-2 py-0.5 rounded-md">
                      {durationText}
                    </span>
                    {q.status && (
                      <span className="absolute top-2.5 right-2.5">
                        <QuotationStatusBadge status={q.status} />
                      </span>
                    )}
                  </div>

                  {/* Name and price get the room: the price used to share a
                      footer strip with five icons and was cut off. */}
                  <div className="p-4 flex-1 flex flex-col gap-2">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-zinc-100 leading-snug line-clamp-2" title={q.tripName}>
                      {q.tripName}
                    </h4>
                    <div className="mt-auto flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums leading-tight">
                          {Number(q.priceQuote) > 0 ? formatCurrency(q.priceQuote) : <span className="text-sm font-medium text-slate-400">No price set</span>}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                          {q.customerName && q.customerName !== 'TBD' ? q.customerName : 'Template'}
                          {q.createdAt ? ` · ${formatDate(q.createdAt)}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 px-2 py-1.5 border-t border-slate-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => copyPreviewLink(q.id, q.quotationId)}
                      className={iconBtn}
                      title="Copy the customer link"
                      aria-label={`Copy the customer link for ${q.tripName}`}
                    >
                      {copiedId === q.quotationId ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                    </button>
                    {canCreate && (
                      <button
                        type="button"
                        onClick={() => handleDuplicate(q.quotationId)}
                        className={iconBtn}
                        title="Duplicate"
                        aria-label={`Duplicate ${q.tripName}`}
                      >
                        <Files size={15} />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuotation(q);
                          setFormOpen(true);
                        }}
                        className={iconBtn}
                        title="Edit"
                        aria-label={`Edit ${q.tripName}`}
                      >
                        <Edit size={15} />
                      </button>
                    )}
                    {canEdit && q.status !== 'Accepted' && (
                      <button
                        type="button"
                        onClick={() => handleConvertToBooking(q)}
                        disabled={convertingId === q.quotationId}
                        className={iconBtn}
                        title="Convert to Booking - use when the customer confirmed by phone/in person"
                        aria-label={`Convert ${q.tripName} to a booking`}
                      >
                        <CheckCircle size={15} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(q)}
                        className="h-9 flex-1 flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition cursor-pointer"
                        title="Delete"
                        aria-label={`Delete ${q.tripName}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && (
        <Pagination
          currentPage={filters.page}
          totalPages={pagination.totalPages}
          totalCount={pagination.totalCount}
          limit={filters.limit}
          itemName="quotations"
          onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
          className="mt-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm"
        />
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

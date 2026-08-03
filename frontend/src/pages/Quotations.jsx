import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Copy, Check, Trash2, Edit, Files } from 'lucide-react';
import * as quotationService from '../services/quotationService';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../hooks/useToast.jsx';
import QuotationFormModal from '../components/quotation/QuotationFormModal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import { QuotationStatusBadge } from '../components/common/StatusBadge.jsx';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/common/Table.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Input from '../components/ui/Input.jsx';

export default function Quotations() {
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
        <Table>
          <Thead>
            <Th>Trip & Package</Th>
            <Th>Quote Price</Th>
            <Th className="text-right">Actions</Th>
          </Thead>
          <Tbody>
              {loading && (
                <Tr>
                  <Td colSpan={3} className="py-8 text-center text-slate-400 dark:text-zinc-500">
                    <span className="loading loading-spinner text-slate-400" /> Loading itineraries...
                  </Td>
                </Tr>
              )}
              {!loading && quotations.length === 0 && (
                <Tr>
                  <Td colSpan={3} className="py-12 text-center text-slate-400 dark:text-zinc-500">
                    No quotations found. Click "Create Quotation" to draft your first day-by-day plan.
                  </Td>
                </Tr>
              )}
              {!loading &&
                quotations.map((q) => (
                  <Tr key={q.quotationId}>
                    <Td>
                      <div className="font-medium text-slate-700 dark:text-zinc-200">
                        {q.tripName} - {q.itineraryDays?.length || 0}D{q.itineraryDays?.length > 1 ? `${q.itineraryDays.length - 1}N` : ''}
                      </div>
                    </Td>
                    <Td className="font-semibold text-slate-700 dark:text-zinc-200">{formatCurrency(q.priceQuote)}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => copyPreviewLink(q.id, q.quotationId)}
                          className="btn-icon text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
                          title="Copy public itinerary link for client review"
                        >
                          {copiedId === q.quotationId ? <Check size={14} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        <button
                          onClick={() => handleDuplicate(q.quotationId)}
                          className="btn-icon text-slate-400 hover:text-slate-700"
                          title="Duplicate itinerary"
                        >
                          <Files size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingQuotation(q);
                            setFormOpen(true);
                          }}
                          className="btn-icon text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
                          title="Edit itinerary"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(q)}
                          className="btn-icon text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Delete quotation"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
          </Tbody>
        </Table>

        {/* Pagination controls */}
        {!loading && quotations.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-slate-50 dark:border-zinc-800/50 text-xs text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-950/30">
            <div>
              Showing <span className="font-semibold text-slate-700 dark:text-zinc-200">{Math.min((filters.page - 1) * filters.limit + 1, pagination.totalCount)}</span> to{' '}
              <span className="font-semibold text-slate-700 dark:text-zinc-200">{Math.min(filters.page * filters.limit, pagination.totalCount)}</span> of{' '}
              <span className="font-semibold text-slate-700 dark:text-zinc-200">{pagination.totalCount}</span> quotations
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

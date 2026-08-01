import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import LeadFilters from '../components/lead/LeadFilters.jsx';
import LeadTable from '../components/lead/LeadTable.jsx';
import LeadFormModal from '../components/lead/LeadFormModal.jsx';
import LeadViewModal from '../components/lead/LeadViewModal.jsx';
import ConvertLeadModal from '../components/lead/ConvertLeadModal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import * as leadService from '../services/leadService';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Leads() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '', stage: '', assignedTo: '', sort: 'newest', page: 1, limit: 10,
  });

  const [pagination, setPagination] = useState({ totalCount: 0, totalPages: 1, currentPage: 1, limit: 10 });

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);
  const [convertingLead, setConvertingLead] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    leadService
      .getLeads(filters)
      .then((data) => {
        setLeads(data.leads || []);
        setPagination(data.pagination || { totalCount: 0, totalPages: 1, currentPage: 1, limit: 10 });
      })
      .catch(() => toast.error('Could not load leads.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(load, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await leadService.deleteLead(deleteTarget.leadId);
      toast.success('Lead deleted.');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Could not delete lead.');
    } finally {
      setDeleting(false);
    }
  };

  const canCreate = user?.role === 'ADMIN' || user?.permissions?.canCreateLeads !== false;

  const handleFiltersChange = (newFilters) => setFilters({ ...newFilters, page: 1 });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <LeadFilters filters={filters} onChange={handleFiltersChange} />
      </div>
      {canCreate && (
        <div className="flex justify-end">
          <button className="btn-primary" onClick={() => { setEditingLead(null); setFormOpen(true); }}>
            <Plus size={16} /> Add Lead
          </button>
        </div>
      )}

      <LeadTable
        leads={leads}
        loading={loading}
        onView={setViewingLead}
        onEdit={(l) => { setEditingLead(l); setFormOpen(true); }}
        onDelete={setDeleteTarget}
        onConvert={setConvertingLead}
      />

      {!loading && leads.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 bg-white p-4 rounded-xl shadow-sm">
          <div>
            Showing <span className="font-semibold text-slate-700">{Math.min((filters.page - 1) * filters.limit + 1, pagination.totalCount)}</span> to{' '}
            <span className="font-semibold text-slate-700">{Math.min(filters.page * filters.limit, pagination.totalCount)}</span> of{' '}
            <span className="font-semibold text-slate-700">{pagination.totalCount}</span> leads
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="btn-secondary px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              Previous
            </button>
            {Array.from({ length: pagination.totalPages }, (_, index) => {
              const p = index + 1;
              return (
                <button
                  key={p}
                  onClick={() => setFilters((prev) => ({ ...prev, page: p }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filters.page === p ? 'bg-brand-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              disabled={filters.page >= pagination.totalPages}
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="btn-secondary px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <LeadFormModal open={formOpen} lead={editingLead} onClose={() => setFormOpen(false)} onSaved={load} onConvert={setConvertingLead} />
      <LeadViewModal open={!!viewingLead} lead={viewingLead} onClose={() => setViewingLead(null)} onRefresh={load} />
      <ConvertLeadModal open={!!convertingLead} lead={convertingLead} onClose={() => setConvertingLead(null)} onConverted={load} />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete lead?"
        message={`This will remove "${deleteTarget?.customerName}"'s lead from the active pipeline.`}
      />
    </div>
  );
}

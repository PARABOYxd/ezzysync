import React, { useEffect, useState, useMemo } from 'react';
import { Wallet, Plus, Trash2, Edit2, CheckCircle, Clock, Link as LinkIcon, RefreshCw, X, Settings, Layers } from 'lucide-react';
import * as expenseService from '../services/expenseService';
import api from '../services/api';
import { useToast } from '../hooks/useToast.jsx';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/common/Table.jsx';

const CATEGORIES = ['Hotel', 'Flight', 'Transport', 'Other'];

export default function Expenses() {
  const toast = useToast();
  const [expenses, setExpenses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLinkType, setFilterLinkType] = useState('all');

  // Expense Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'Other',
    link_type: 'general',
    booking_id: '',
    batch_id: '',
    vendor_name: '',
    status: 'Pending',
  });

  // Cost Templates State
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    id: '',
    trip_name: '',
    hotel_cost_per_pax: '',
    flight_cost_per_pax: '',
    transport_cost_per_pax: '',
    other_cost_per_pax: '',
  });
  const [editingTemplateId, setEditingTemplateId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expList, bookList, batchList] = await Promise.all([
        expenseService.listExpenses(),
        api.get('/bookings').then((r) => r.data.bookings || r.data || []),
        api.get('/batches').then((r) => r.data.batches || r.data || []),
      ]);
      setExpenses(expList);
      setBookings(bookList);
      setBatches(batchList);
    } catch (err) {
      toast.error('Failed to load expenses data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const list = await expenseService.listTemplates();
      setTemplates(list);
    } catch (err) {
      toast.error('Failed to load costing templates.');
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  const handleOpenCreate = () => {
    setEditingExpense(null);
    setForm({
      title: '',
      amount: '',
      category: 'Other',
      link_type: 'general',
      booking_id: '',
      batch_id: '',
      vendor_name: '',
      status: 'Pending',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (exp) => {
    setEditingExpense(exp);
    setForm({
      title: exp.title,
      amount: exp.amount,
      category: exp.category,
      link_type: exp.link_type,
      booking_id: exp.booking_id || '',
      batch_id: exp.batch_id || '',
      vendor_name: exp.vendor_name || '',
      status: exp.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Please enter an expense title.');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Please enter a valid amount.');

    try {
      if (editingExpense) {
        await expenseService.updateExpense(editingExpense.id, form);
        toast.success('Expense updated successfully.');
      } else {
        await expenseService.createExpense(form);
        toast.success('Expense logged successfully.');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await expenseService.deleteExpense(id);
      toast.success('Expense deleted successfully.');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete expense.');
    }
  };

  // Cost Templates Handlers
  const handleOpenTemplates = () => {
    fetchTemplates();
    setTemplateForm({
      id: '',
      trip_name: '',
      template_name: 'Default',
      hotel_cost_per_pax: '',
      flight_cost_per_pax: '',
      transport_cost_per_pax: '',
      other_cost_per_pax: '',
    });
    setEditingTemplateId(null);
    setTemplatesModalOpen(true);
  };

  const handleEditTemplate = (t) => {
    setEditingTemplateId(t.id);
    setTemplateForm({
      trip_name: t.trip_name,
      template_name: t.template_name || 'Default',
      hotel_cost_per_pax: t.hotel_cost_per_pax,
      flight_cost_per_pax: t.flight_cost_per_pax,
      transport_cost_per_pax: t.transport_cost_per_pax,
      other_cost_per_pax: t.other_cost_per_pax,
    });
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!templateForm.trip_name.trim()) return toast.error('Please enter a trip/destination name.');
    if (!templateForm.template_name.trim()) return toast.error('Please enter a template/version name.');
    
    try {
      await expenseService.upsertTemplate(templateForm);
      toast.success('Cost template saved successfully.');
      // Reset form
      setTemplateForm({
        id: '',
        trip_name: '',
        template_name: 'Default',
        hotel_cost_per_pax: '',
        flight_cost_per_pax: '',
        transport_cost_per_pax: '',
        other_cost_per_pax: '',
      });
      setEditingTemplateId(null);
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to save costing template.');
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Delete this trip costing template?')) return;
    try {
      await expenseService.deleteTemplate(id);
      toast.success('Template deleted successfully.');
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to delete template.');
    }
  };

  // Filter Pipeline
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) || 
                            (e.vendor_name || '').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
      const matchesLinkType = filterLinkType === 'all' || e.link_type === filterLinkType;
      return matchesSearch && matchesCategory && matchesLinkType;
    });
  }, [expenses, search, filterCategory, filterLinkType]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-20">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Wallet className="text-brand-600 dark:text-brand-400" size={26} />
            Expense Manager
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Log, categorize, and link vendor costs. Set templates to auto-fill expenses for new bookings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenTemplates}
            className="btn flex items-center gap-2 h-10 px-4 text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-600 dark:border-zinc-800 dark:text-slate-300 dark:hover:bg-zinc-800 rounded-xl shadow-sm transition"
          >
            <Settings size={15} /> Cost Templates
          </button>
          
          <button
            onClick={handleOpenCreate}
            className="btn btn-primary shrink-0 flex items-center gap-2 h-10 px-4 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md transition active:scale-[0.98]"
          >
            <Plus size={16} /> Log Expense
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <input
          type="text"
          placeholder="Search by title, vendor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:flex-1 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none shadow-sm"
        />

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 md:w-[150px] bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer shadow-sm"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Link Type Filter */}
          <select
            value={filterLinkType}
            onChange={(e) => setFilterLinkType(e.target.value)}
            className="flex-1 md:w-[150px] bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer shadow-sm"
          >
            <option value="all">All Links</option>
            <option value="booking">Private Bookings</option>
            <option value="batch">Group Tours</option>
            <option value="general">General Overhead</option>
          </select>
        </div>
      </div>

      {/* Main Expenses Table */}
      <div className="card p-0 overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl shadow-sm">
        <Table>
          <Thead>
            <Th>Title / Details</Th>
            <Th>Category</Th>
            <Th>Linked Entity</Th>
            <Th>Vendor</Th>
            <Th className="text-right">Amount</Th>
            <Th className="text-center">Status</Th>
            <Th className="text-right">Actions</Th>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr>
                <Td colSpan={7} className="text-center py-8">
                  <RefreshCw className="animate-spin text-slate-400 mx-auto" size={24} />
                  <span className="text-xs text-slate-400 font-semibold mt-2 block">Fetching expenses...</span>
                </Td>
              </Tr>
            ) : filteredExpenses.length === 0 ? (
              <Tr>
                <Td colSpan={7} className="text-center text-slate-400 italic py-10">
                  No logged expenses matches selected criteria.
                </Td>
              </Tr>
            ) : (
              filteredExpenses.map((exp) => (
                <Tr key={exp.id}>
                  <Td>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">{exp.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Logged by: {exp.created_by || 'System'}</span>
                  </Td>
                  <Td>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {exp.category}
                    </span>
                  </Td>
                  <Td>
                    {exp.link_type === 'booking' && exp.booking_customer ? (
                      <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                        <LinkIcon size={12} />
                        <span className="truncate">{exp.booking_customer} ({exp.booking_code || 'FIT'})</span>
                      </div>
                    ) : exp.link_type === 'batch' && exp.batch_name ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <LinkIcon size={12} />
                        <span className="truncate">{exp.batch_name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-zinc-600 text-xs italic">General Overhead</span>
                    )}
                  </Td>
                  <Td className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {exp.vendor_name || '-'}
                  </Td>
                  <Td className="text-right font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(exp.amount)}
                  </Td>
                  <Td className="text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      exp.status === 'Paid' 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                    }`}>
                      {exp.status === 'Paid' ? <CheckCircle size={10} /> : <Clock size={10} />}
                      {exp.status}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(exp)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-500 hover:text-brand-600 transition"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-950/10 rounded text-slate-400 hover:text-red-500 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </div>

      {/* 🚀 Cost Templates Config Modal */}
      {templatesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl w-full max-w-[680px] relative max-h-[85vh] overflow-y-auto animate-[fadeIn_0.15s_ease-out] space-y-6">
            <button
              onClick={() => { setTemplatesModalOpen(false); fetchData(); }}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg flex items-center gap-1.5">
                <Layers size={18} className="text-brand-500" /> Default Trip Costing Templates
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Define the default per-pax costing structure for each destination trip. Expenses will be auto-generated when bookings are marked as 'Booked'.
              </p>
            </div>

            {/* Template Entry / Edit Form */}
            <form onSubmit={handleSaveTemplate} className="bg-slate-50 dark:bg-zinc-900/60 p-4 border border-slate-200/60 dark:border-zinc-800 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                {editingTemplateId ? 'Edit Selected Template' : 'Add New Trip Template'}
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-500">Trip / Destination Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chopta Tungnath"
                    value={templateForm.trip_name}
                    onChange={(e) => setTemplateForm({ ...templateForm, trip_name: e.target.value })}
                    className="bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-500">Template / Version Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Standard - Raju Travels"
                    value={templateForm.template_name}
                    onChange={(e) => setTemplateForm({ ...templateForm, template_name: e.target.value })}
                    className="bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-500">Hotel / Pax (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={templateForm.hotel_cost_per_pax}
                    onChange={(e) => setTemplateForm({ ...templateForm, hotel_cost_per_pax: e.target.value })}
                    className="bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-500">Flight / Pax (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={templateForm.flight_cost_per_pax}
                    onChange={(e) => setTemplateForm({ ...templateForm, flight_cost_per_pax: e.target.value })}
                    className="bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-500">Transport / Pax (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={templateForm.transport_cost_per_pax}
                    onChange={(e) => setTemplateForm({ ...templateForm, transport_cost_per_pax: e.target.value })}
                    className="bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-500">Other / Pax (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={templateForm.other_cost_per_pax}
                    onChange={(e) => setTemplateForm({ ...templateForm, other_cost_per_pax: e.target.value })}
                    className="bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {editingTemplateId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplateId(null);
                      setTemplateForm({ id: '', trip_name: '', template_name: 'Default', hotel_cost_per_pax: '', flight_cost_per_pax: '', transport_cost_per_pax: '', other_cost_per_pax: '' });
                    }}
                    className="px-3 py-1.5 border border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-sm"
                >
                  {editingTemplateId ? 'Update Template' : 'Add Template'}
                </button>
              </div>
            </form>

            {/* Configured Templates List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Configured Templates</h4>
              <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <Table>
                  <Thead>
                    <Th className="py-2 text-[10px]">Trip Name / Version</Th>
                    <Th className="py-2 text-right text-[10px]">Hotel / Pax</Th>
                    <Th className="py-2 text-right text-[10px]">Flight / Pax</Th>
                    <Th className="py-2 text-right text-[10px]">Transport / Pax</Th>
                    <Th className="py-2 text-right text-[10px]">Other / Pax</Th>
                    <Th className="py-2 text-right text-[10px]">Actions</Th>
                  </Thead>
                  <Tbody>
                    {templatesLoading ? (
                      <Tr><Td colSpan={6} className="text-center py-6 text-xs text-slate-400 font-semibold">Loading templates...</Td></Tr>
                    ) : templates.length === 0 ? (
                      <Tr><Td colSpan={6} className="text-center py-6 text-xs text-slate-400 italic">No cost templates added yet.</Td></Tr>
                    ) : (
                      templates.map((t) => (
                        <Tr key={t.id}>
                          <Td className="py-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                            <div>{t.trip_name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{t.template_name || 'Default'}</div>
                          </Td>
                          <Td className="py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">{formatCurrency(t.hotel_cost_per_pax)}</Td>
                          <Td className="py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">{formatCurrency(t.flight_cost_per_pax)}</Td>
                          <Td className="py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">{formatCurrency(t.transport_cost_per_pax)}</Td>
                          <Td className="py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">{formatCurrency(t.other_cost_per_pax)}</Td>
                          <Td className="py-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => handleEditTemplate(t)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-500 hover:text-brand-600 transition"><Edit2 size={12} /></button>
                              <button onClick={() => handleDeleteTemplate(t.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-950/10 rounded text-slate-400 hover:text-red-500 transition"><Trash2 size={12} /></button>
                            </div>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => { setTemplatesModalOpen(false); fetchData(); }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Close &amp; Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log/Edit Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl w-full max-w-[460px] relative animate-[fadeIn_0.15s_ease-out]">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
            >
              <X size={18} />
            </button>

            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-4">
              {editingExpense ? 'Edit Expense Deal' : 'Log New Expense'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Expense Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raju Transport Bus Bill"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Amount */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 25000"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Link Type */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Link Expense To *</label>
                <select
                  value={form.link_type}
                  onChange={(e) => setForm({ ...form, link_type: e.target.value, booking_id: '', batch_id: '' })}
                  className="w-full bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                >
                  <option value="general">General Overhead (No trip linkage)</option>
                  <option value="booking">Private Booking (FIT)</option>
                  <option value="batch">Group Tour (Batch)</option>
                </select>
              </div>

              {/* Dynamic Entity Selectors */}
              {form.link_type === 'booking' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Select Private Booking *</label>
                  <select
                    required
                    value={form.booking_id}
                    onChange={(e) => setForm({ ...form, booking_id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  >
                    <option value="">-- Choose Booking --</option>
                    {bookings
                      .filter(b => b.travelStatus !== 'Cancelled')
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.customerName} - {b.trip} ({b.departure ? new Date(b.departure).toLocaleDateString() : 'N/A'})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {form.link_type === 'batch' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Select Group Tour Batch *</label>
                  <select
                    required
                    value={form.batch_id}
                    onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  >
                    <option value="">-- Choose Batch --</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} - {batch.tripName} ({batch.departureDate})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Vendor & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Vendor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Raju Travels"
                    value={form.vendor_name}
                    onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status *</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 dark:border-zinc-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

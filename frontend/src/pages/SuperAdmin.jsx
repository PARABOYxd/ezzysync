import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  RefreshCw,
  Users,
  Building2,
  CalendarCheck,
  CreditCard,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  Trash2,
  Edit,
  Sliders,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  UserCheck,
  Phone,
  Mail,
  MoreVertical,
  X,
  PlusCircle,
  Eye,
  MessageSquare,
  Lock,
  Unlock,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import { superAdminService } from '../services/superAdminService';
import { useToast } from '../hooks/useToast.jsx';

export default function SuperAdmin() {
  const toast = useToast();

  // State
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected agency for drawers/modals
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Plan modal
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    planId: 'TRIAL',
    planExpiresAt: '',
    trialExtendedDays: 0,
    isPaused: false,
  });
  const [savingPlan, setSavingPlan] = useState(false);

  // Edit profile modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    adminNotes: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Suspension confirmation modal
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspending, setSuspending] = useState(false);

  // Deletion modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Impersonating
  const [impersonatingId, setImpersonatingId] = useState(null);

  // Fetch KPI Stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const data = await superAdminService.getStats();
      setStats(data);
    } catch (err) {
      toast.error('Failed to load platform stats');
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch Tenants List
  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await superAdminService.listTenants({
        search,
        status: statusFilter,
        page,
        limit: 50,
      });
      setTenants(data.tenants || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      toast.error('Failed to fetch agency accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTenants();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, page]);

  // Open 360 Drawer
  const open360Drawer = async (tenant) => {
    setSelectedTenant(tenant);
    setDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const details = await superAdminService.getTenantDetails(tenant.id);
      setDrawerData(details);
    } catch (err) {
      toast.error('Failed to load agency details');
      console.error(err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Open Plan Modal
  const openPlanModal = (tenant) => {
    setSelectedTenant(tenant);
    setPlanForm({
      planId: tenant.plan_id || 'TRIAL',
      planExpiresAt: tenant.plan_expires_at
        ? new Date(tenant.plan_expires_at).toISOString().split('T')[0]
        : '',
      trialExtendedDays: tenant.trial_extended_days || 0,
      isPaused: Boolean(tenant.is_paused),
    });
    setPlanModalOpen(true);
  };

  // Save Plan
  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!selectedTenant) return;
    try {
      setSavingPlan(true);
      await superAdminService.updateTenantPlan(selectedTenant.id, {
        planId: planForm.planId === 'TRIAL' ? 'FREE' : planForm.planId,
        planExpiresAt: planForm.planExpiresAt ? new Date(planForm.planExpiresAt).toISOString() : null,
        trialExtendedDays: Number(planForm.trialExtendedDays) || 0,
        isPaused: planForm.isPaused,
      });
      toast.success('Subscription & plan updated successfully');
      setPlanModalOpen(false);
      fetchTenants();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update plan');
    } finally {
      setSavingPlan(false);
    }
  };

  // Open Edit Profile Modal
  const openEditModal = (tenant) => {
    setSelectedTenant(tenant);
    setEditForm({
      name: tenant.name || '',
      companyName: tenant.company_name || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      adminNotes: tenant.admin_notes || '',
    });
    setEditModalOpen(true);
  };

  // Save Edit Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!selectedTenant) return;
    try {
      setSavingProfile(true);
      await superAdminService.updateTenantProfile(selectedTenant.id, editForm);
      toast.success('Agency details updated');
      setEditModalOpen(false);
      fetchTenants();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update agency');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Suspension Toggle
  const handleToggleSuspension = async () => {
    if (!selectedTenant) return;
    const willSuspend = !selectedTenant.is_suspended;
    try {
      setSuspending(true);
      await superAdminService.toggleSuspension(selectedTenant.id, willSuspend);
      toast.success(willSuspend ? 'Agency account suspended' : 'Agency account reactivated');
      setSuspendModalOpen(false);
      fetchTenants();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setSuspending(false);
    }
  };

  // Handle Impersonation
  const handleImpersonate = async (tenant) => {
    const confirm = window.confirm(
      `Log in as "${tenant.company_name || tenant.name}"?\n\nYou will switch into their account to inspect settings, itineraries, bookings, and chats. You can return back to Super Admin anytime via the top banner.`
    );
    if (!confirm) return;

    try {
      setImpersonatingId(tenant.id);
      const res = await superAdminService.impersonateTenant(tenant.id);
      
      // Save current super admin session for easy return
      const currentToken = localStorage.getItem('hf_token');
      const currentRefreshToken = localStorage.getItem('hf_refresh_token');
      const currentUser = localStorage.getItem('hf_user');

      localStorage.setItem('hf_impersonator', JSON.stringify({
        token: currentToken,
        refreshToken: currentRefreshToken,
        user: currentUser ? JSON.parse(currentUser) : null,
      }));

      // Set impersonated agency tokens
      localStorage.setItem('hf_token', res.token);
      localStorage.setItem('hf_refresh_token', res.refreshToken);
      localStorage.setItem('hf_user', JSON.stringify(res.user));

      toast.success(`Switching to ${tenant.company_name || tenant.name}...`);
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to impersonate agency');
      setImpersonatingId(null);
    }
  };

  // Handle Deletion
  const handleDeleteTenant = async () => {
    if (!selectedTenant) return;
    if (deleteConfirmText.trim() !== (selectedTenant.company_name || selectedTenant.name)) {
      toast.error('Agency name confirmation does not match');
      return;
    }

    try {
      setDeleting(true);
      await superAdminService.deleteTenant(selectedTenant.id);
      toast.success('Agency account permanently deleted');
      setDeleteModalOpen(false);
      setDeleteConfirmText('');
      fetchTenants();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete agency');
    } finally {
      setDeleting(false);
    }
  };

  // Quick Extend Helper
  const quickExtend = (days) => {
    setPlanForm((prev) => ({
      ...prev,
      trialExtendedDays: (Number(prev.trialExtendedDays) || 0) + days,
    }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent p-5 rounded-2xl border border-amber-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={13} /> Super Admin Control
            </span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Platform Master Console
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
            Registered Agencies & Subscription Management
          </h1>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
            Monitor all travel agencies, extend free trials, manage subscriptions, debug via 1-click login, and audit platform usage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              fetchStats();
              fetchTenants();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-200 transition shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className={loading || statsLoading ? 'animate-spin' : ''} />
            <span>Refresh All</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-1.5">
            <span className="text-xs font-semibold">Total Agencies</span>
            <Building2 size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-zinc-100">
            {statsLoading ? '...' : stats?.totalTenants || 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
            Registered CRM Tenants
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-emerald-500/20 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1.5">
            <span className="text-xs font-semibold">Active Paid</span>
            <CheckCircle2 size={16} />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {statsLoading ? '...' : stats?.activePaidTenants || 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
            Solo & Pro Subscribers
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-amber-500/20 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1.5">
            <span className="text-xs font-semibold">On Free Trial</span>
            <Clock size={16} />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {statsLoading ? '...' : stats?.trialTenants || 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
            Active 30-Day Trials
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-rose-500/20 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1.5">
            <span className="text-xs font-semibold">Expired / Paused</span>
            <AlertTriangle size={16} />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {statsLoading ? '...' : (stats?.expiredTenants || 0) + (stats?.pausedTenants || 0)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
            {stats?.expiredTenants || 0} Expired • {stats?.pausedTenants || 0} Paused
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-purple-500/20 rounded-xl p-4 shadow-xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1.5">
            <span className="text-xs font-semibold">Platform Bookings</span>
            <TrendingUp size={16} />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {statsLoading ? '...' : stats?.totalBookings || 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
            ₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')} GMV recorded
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Status Filters */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
            />
            <input
              type="text"
              placeholder="Search by company, owner name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
            Showing <strong className="text-slate-900 dark:text-zinc-100">{tenants.length}</strong> of{' '}
            <strong className="text-slate-900 dark:text-zinc-100">{totalCount}</strong> agencies
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { id: 'all', label: 'All Agencies', count: stats?.totalTenants },
            { id: 'paid', label: '🟢 Active Paid', count: stats?.activePaidTenants },
            { id: 'trial', label: '🟡 Free Trial', count: stats?.trialTenants },
            { id: 'expired', label: '🔴 Expired', count: stats?.expiredTenants },
            { id: 'paused', label: '⏸️ Paused', count: stats?.pausedTenants },
            { id: 'suspended', label: '⛔ Suspended', count: stats?.suspendedTenants },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-amber-500 text-white shadow-xs font-bold'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    statusFilter === tab.id
                      ? 'bg-black/20 text-white'
                      : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/75 dark:bg-zinc-950/50 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-zinc-400">
                <th className="py-3 px-4">Agency / Owner</th>
                <th className="py-3 px-4">Plan & Expiry</th>
                <th className="py-3 px-4">Team & Stats</th>
                <th className="py-3 px-4">Integrations</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading agencies database...</span>
                    </div>
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-zinc-400">
                    <Building2 size={32} className="mx-auto text-slate-300 dark:text-zinc-700 mb-2" />
                    <p className="font-semibold">No agencies match your criteria</p>
                    <p className="text-[11px] mt-0.5">Try searching with a different keyword or resetting filters.</p>
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => {
                  const isPaid = ['SOLO', 'PRO', 'PRO_ACTIVE'].includes(tenant.plan_id);
                  const isSuspended = tenant.is_suspended;
                  const isPaused = tenant.is_paused;

                  return (
                    <tr
                      key={tenant.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition group"
                    >
                      {/* Agency & Owner */}
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-xs flex items-center justify-center shrink-0 uppercase shadow-xs">
                            {(tenant.company_name || tenant.name || 'A')[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-zinc-100 truncate block">
                                {tenant.company_name || 'Unnamed Agency'}
                              </span>
                              {tenant.admin_notes && (
                                <span
                                  title={`Admin Note: ${tenant.admin_notes}`}
                                  className="w-2 h-2 rounded-full bg-blue-500 shrink-0"
                                />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate flex items-center gap-1">
                              <span>{tenant.name || 'Owner'}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-zinc-500 truncate flex items-center gap-1.5 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail size={11} /> {tenant.email}
                              </span>
                              {tenant.phone && (
                                <span className="flex items-center gap-1">
                                  • <Phone size={11} /> {tenant.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Plan & Countdown */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {isSuspended ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-bold text-[10px]">
                              <Lock size={10} /> Suspended
                            </span>
                          ) : isPaused ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-bold text-[10px]">
                              <PauseCircle size={10} /> Paused
                            </span>
                          ) : isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                              <CheckCircle2 size={10} /> {tenant.plan_id === 'SOLO' ? 'Solo Plan' : 'Pro Plan'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold text-[10px]">
                              <Clock size={10} /> Free Trial
                            </span>
                          )}

                          {/* Days Left / Expiry label */}
                          <div className="text-[11px] font-medium text-slate-600 dark:text-zinc-300">
                            {isSuspended ? (
                              <span className="text-red-600 dark:text-red-400">Access Blocked</span>
                            ) : isPaused ? (
                              <span className="text-slate-500">Subscription on hold</span>
                            ) : tenant.days_left > 0 ? (
                              <span className={tenant.days_left <= 5 ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}>
                                {tenant.days_left} {tenant.days_left === 1 ? 'day' : 'days'} left
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 font-bold">
                                Expired ({Math.abs(tenant.days_left)}d ago)
                              </span>
                            )}
                          </div>

                          {tenant.trial_extended_days > 0 && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400">
                              +{tenant.trial_extended_days} days trial bonus
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Team & Stats */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-200">
                            <Users size={12} className="text-slate-400" />
                            <span>{tenant.team_count} Team {tenant.team_count === 1 ? 'member' : 'members'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400">
                            <CalendarCheck size={12} className="text-slate-400" />
                            <span>{tenant.bookings_count} Bookings (₹{Number(tenant.total_revenue).toLocaleString('en-IN')})</span>
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-zinc-500 pl-4">
                            {tenant.leads_count} Leads recorded
                          </div>
                        </div>
                      </td>

                      {/* Integrations */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                tenant.whatsapp_status === 'CONNECTED'
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-300 dark:bg-zinc-700'
                              }`}
                            />
                            <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-300">
                              WA: {tenant.whatsapp_status === 'CONNECTED' ? 'Linked' : 'Not linked'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                tenant.gmail_connected
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-300 dark:bg-zinc-700'
                              }`}
                            />
                            <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-300">
                              Gmail: {tenant.gmail_connected ? 'Connected' : 'Offline'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-zinc-400 text-[11px]">
                        {new Date(tenant.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* 1-Click Login (Impersonate) */}
                          <button
                            type="button"
                            onClick={() => handleImpersonate(tenant)}
                            disabled={impersonatingId === tenant.id}
                            title="1-Click Login as this Agency (Debug & Support)"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>Login</span>
                          </button>

                          {/* Manage Plan & Trial */}
                          <button
                            type="button"
                            onClick={() => openPlanModal(tenant)}
                            title="Extend Trial / Change Plan / Pause"
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                          >
                            <Sliders size={14} />
                          </button>

                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => openEditModal(tenant)}
                            title="Edit Agency Profile & Admin Notes"
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                          >
                            <Edit size={14} />
                          </button>

                          {/* 360 View */}
                          <button
                            type="button"
                            onClick={() => open360Drawer(tenant)}
                            title="View Agency 360° Breakdown"
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                          >
                            <ChevronRight size={15} />
                          </button>

                          {/* Suspend Toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setSuspendModalOpen(true);
                            }}
                            title={tenant.is_suspended ? 'Unsuspend Agency' : 'Suspend Agency'}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              tenant.is_suspended
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-amber-600 hover:bg-amber-50'
                            }`}
                          >
                            {tenant.is_suspended ? <Unlock size={14} /> : <Lock size={14} />}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setDeleteConfirmText('');
                              setDeleteModalOpen(true);
                            }}
                            title="Delete Agency Account"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PLAN & TRIAL EXTENSION MODAL */}
      {planModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  Manage Plan & Subscription
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  {selectedTenant.company_name || selectedTenant.name} ({selectedTenant.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              {/* Plan Selection */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Subscription Plan Override
                </label>
                <select
                  value={planForm.planId}
                  onChange={(e) => setPlanForm({ ...planForm, planId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="TRIAL">Free Trial (Default)</option>
                  <option value="SOLO">Solo Plan (Paid)</option>
                  <option value="PRO">Pro Plan (Paid)</option>
                  <option value="PRO_ACTIVE">Pro Active (Full Suite)</option>
                </select>
              </div>

              {/* Quick Trial Extenders */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Quick Trial Bonus Extension
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => quickExtend(7)}
                    className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-lg font-bold"
                  >
                    +7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => quickExtend(14)}
                    className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-lg font-bold"
                  >
                    +14 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => quickExtend(30)}
                    className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-lg font-bold"
                  >
                    +30 Days
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Total Bonus Days Added:</span>
                  <input
                    type="number"
                    min="0"
                    value={planForm.trialExtendedDays}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, trialExtendedDays: Number(e.target.value) })
                    }
                    className="w-20 px-2 py-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded text-center text-xs font-bold"
                  />
                </div>
              </div>

              {/* Custom Plan Expiry Date */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Paid Plan Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={planForm.planExpiresAt}
                  onChange={(e) => setPlanForm({ ...planForm, planExpiresAt: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Leave blank for standard automatic billing or lifetime admin grant.
                </span>
              </div>

              {/* Pause Subscription Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200 block">
                    Pause Subscription
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Temporarily puts paid renewal on hold without deleting any customer data.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={planForm.isPaused}
                  onChange={(e) => setPlanForm({ ...planForm, isPaused: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  {savingPlan ? 'Saving...' : 'Save Plan Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROFILE & ADMIN NOTES MODAL */}
      {editModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  Edit Agency Profile & Notes
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Update primary account details and internal admin records
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Company / Agency Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.companyName}
                  onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Primary Owner Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="+91..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Internal Admin Notes 🔒
                </label>
                <textarea
                  rows={3}
                  value={editForm.adminNotes}
                  onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                  placeholder="Private support notes, billing arrangement details, enterprise deals..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Only visible to Super Admins, never displayed to the agency.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUSPENSION MODAL */}
      {suspendModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                {selectedTenant.is_suspended ? 'Reactivate Agency Account?' : 'Suspend Agency Account?'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-2">
                {selectedTenant.is_suspended ? (
                  <>
                    This will immediately restore CRM access for{' '}
                    <strong>{selectedTenant.company_name || selectedTenant.name}</strong> and all their
                    team members.
                  </>
                ) : (
                  <>
                    Suspending{' '}
                    <strong>{selectedTenant.company_name || selectedTenant.name}</strong> will instantly
                    block all team members from accessing the CRM until reactivated.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuspendModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={suspending}
                onClick={handleToggleSuspension}
                className={`px-5 py-2 rounded-xl font-bold text-xs text-white transition shadow-xs ${
                  selectedTenant.is_suspended
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {suspending
                  ? 'Processing...'
                  : selectedTenant.is_suspended
                  ? 'Yes, Reactivate Access'
                  : 'Yes, Suspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETION CONFIRMATION MODAL */}
      {deleteModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-rose-600 dark:text-rose-400">
                Permanently Delete Agency?
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-2">
                This action is <strong>irreversible</strong>. All bookings, leads, itineraries, and user
                accounts under{' '}
                <strong>{selectedTenant.company_name || selectedTenant.name}</strong> will be erased.
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block text-slate-700 dark:text-zinc-300 font-semibold">
                Type <strong className="text-rose-600">{selectedTenant.company_name || selectedTenant.name}</strong> to confirm:
              </label>
              <input
                type="text"
                placeholder="Agency name"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  deleting ||
                  deleteConfirmText.trim() !== (selectedTenant.company_name || selectedTenant.name)
                }
                onClick={handleDeleteTenant}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-xs"
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AGENCY 360° DRAWER */}
      {drawerOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-zinc-800">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  {(selectedTenant.company_name || selectedTenant.name || 'A')[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                    {selectedTenant.company_name || 'Agency Details'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Owner: {selectedTenant.name} • {selectedTenant.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {drawerLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading full agency profile...</span>
                </div>
              ) : drawerData ? (
                <>
                  {/* Quick Action in Drawer */}
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 rounded-xl">
                    <div className="flex-1">
                      <span className="font-bold text-amber-900 dark:text-amber-300 block">
                        Super Admin Debug Access
                      </span>
                      <span className="text-[11px] text-amber-700 dark:text-amber-400">
                        Log into this agency account in one click without password.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleImpersonate(selectedTenant)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-xs transition"
                    >
                      Login Now ➔
                    </button>
                  </div>

                  {/* Business Metrics */}
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider text-[11px] mb-2">
                      Business Metrics
                    </h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl">
                        <span className="text-slate-400 text-[11px] block">Total Bookings</span>
                        <span className="text-base font-bold text-slate-900 dark:text-zinc-100">
                          {drawerData.metrics?.total_bookings || 0}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl">
                        <span className="text-slate-400 text-[11px] block">Total GMV</span>
                        <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{Number(drawerData.metrics?.total_revenue || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl">
                        <span className="text-slate-400 text-[11px] block">Leads Processed</span>
                        <span className="text-base font-bold text-slate-900 dark:text-zinc-100">
                          {drawerData.metrics?.total_leads || 0}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl">
                        <span className="text-slate-400 text-[11px] block">Quotations Generated</span>
                        <span className="text-base font-bold text-slate-900 dark:text-zinc-100">
                          {drawerData.metrics?.total_quotations || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Agency Settings & Info */}
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider text-[11px] mb-2">
                      Agency Details & Integrations
                    </h4>
                    <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">GST Number:</span>
                        <span className="font-medium text-slate-800 dark:text-zinc-200">
                          {drawerData.gst_number || 'Not provided'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Address:</span>
                        <span className="font-medium text-slate-800 dark:text-zinc-200 max-w-[60%] text-right truncate">
                          {drawerData.address || 'Not provided'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">WhatsApp Web:</span>
                        <span className="font-medium">
                          {drawerData.whatsapp_status === 'CONNECTED' ? (
                            <span className="text-emerald-600 font-bold">Connected ({drawerData.whatsapp_phone || 'Active'})</span>
                          ) : (
                            <span className="text-slate-400">Disconnected</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gmail Integration:</span>
                        <span className="font-medium">
                          {drawerData.gmail_connected ? (
                            <span className="text-emerald-600 font-bold">Connected ({drawerData.gmail_email})</span>
                          ) : (
                            <span className="text-slate-400">Not linked</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Team Members List */}
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider text-[11px] mb-2 flex items-center justify-between">
                      <span>Team Members ({drawerData.team?.length || 0})</span>
                    </h4>
                    <div className="divide-y divide-slate-100 dark:divide-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-zinc-950/50">
                      {drawerData.team?.map((member) => (
                        <div key={member.id} className="p-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-zinc-200 block">
                              {member.name}
                            </span>
                            <span className="text-[11px] text-slate-400">{member.email}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment History */}
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider text-[11px] mb-2">
                      Recent Payments ({drawerData.payments?.length || 0})
                    </h4>
                    {drawerData.payments?.length === 0 ? (
                      <div className="p-3 text-center text-slate-400 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
                        No recorded payment transactions
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {drawerData.payments?.map((pm) => (
                          <div
                            key={pm.id}
                            className="p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-slate-800 dark:text-zinc-200 block">
                                Plan: {pm.plan_id}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                ID: {pm.payment_id || pm.order_id || 'N/A'} •{' '}
                                {new Date(pm.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <span className="font-bold text-emerald-600">
                              ₹{Number(pm.amount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

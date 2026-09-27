import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Building2,
  CalendarCheck,
  Users,
  Lock,
  Unlock,
  Sliders,
  Edit,
  Trash2,
  ChevronRight,
  Eye,
  CheckCircle2,
  PauseCircle,
  Clock,
  Mail,
  Phone,
  X,
  AlertTriangle,
  AlertCircle,
  Check,
  ExternalLink,
  Key,
  RotateCcw,
  MessageSquare,
  Copy,
} from 'lucide-react';
import api from '../api';

export default function RegisteredAgenciesTab({ onAgencyUpdated }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected agency for drawers/modals
  const [selectedTenant, setSelectedTenant] = useState(null);

  // Drawer
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

  // Suspend modal
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspending, setSuspending] = useState(false);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Impersonate modal
  const [impersonateTarget, setImpersonateTarget] = useState(null);
  const [impersonating, setImpersonating] = useState(false);

  // Reset Password modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTenant, setResetTenant] = useState(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [sendResetEmail, setSendResetEmail] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tenants', {
        params: {
          search,
          status: statusFilter,
        },
      });
      setTenants(res.data.tenants || []);
    } catch (err) {
      console.error('Error fetching agencies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTenants();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // Open 360 Drawer
  const open360Drawer = async (tenant) => {
    setSelectedTenant(tenant);
    setDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const res = await api.get(`/tenants/${tenant.id}`);
      setDrawerData(res.data.tenant);
    } catch (err) {
      showToast('Failed to load agency 360 details', 'error');
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
      await api.patch(`/tenants/${selectedTenant.id}/plan`, {
        planId: planForm.planId === 'TRIAL' ? 'FREE' : planForm.planId,
        planExpiresAt: planForm.planExpiresAt ? new Date(planForm.planExpiresAt).toISOString() : null,
        trialExtendedDays: Number(planForm.trialExtendedDays) || 0,
        isPaused: planForm.isPaused,
      });
      setPlanModalOpen(false);
      showToast('Plan updated successfully', 'success');
      fetchTenants();
      if (onAgencyUpdated) onAgencyUpdated();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update plan', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  // Open Edit Profile
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

  // Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!selectedTenant) return;
    try {
      setSavingProfile(true);
      await api.patch(`/tenants/${selectedTenant.id}/profile`, editForm);
      setEditModalOpen(false);
      showToast('Agency profile updated successfully', 'success');
      fetchTenants();
      if (onAgencyUpdated) onAgencyUpdated();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Suspend Toggle
  const handleToggleSuspension = async () => {
    if (!selectedTenant) return;
    const willSuspend = !selectedTenant.is_suspended;
    try {
      setSuspending(true);
      await api.patch(`/tenants/${selectedTenant.id}/status`, { isSuspended: willSuspend });
      setSuspendModalOpen(false);
      showToast(willSuspend ? 'Agency suspended' : 'Agency reactivated', 'success');
      fetchTenants();
      if (onAgencyUpdated) onAgencyUpdated();
    } catch (err) {
      showToast('Failed to update suspension status', 'error');
    } finally {
      setSuspending(false);
    }
  };

  // 1-Click Login / Impersonate
  const handleImpersonate = (tenant) => {
    setImpersonateTarget(tenant);
  };

  const confirmImpersonate = async () => {
    if (!impersonateTarget) return;
    try {
      setImpersonating(true);
      const res = await api.post(`/tenants/${impersonateTarget.id}/impersonate`);
      window.open(
        `http://localhost:5173/login?impersonateToken=${res.data.token}&impersonateRefresh=${res.data.refreshToken}&impersonateUser=${encodeURIComponent(
          JSON.stringify(res.data.user)
        )}`,
        '_blank'
      );
      setImpersonateTarget(null);
      showToast(`Logged into ${impersonateTarget.company_name || impersonateTarget.name}`, 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to impersonate agency', 'error');
    } finally {
      setImpersonating(false);
    }
  };

  // Delete Tenant
  const handleDeleteTenant = async () => {
    if (!selectedTenant) return;
    if (deleteConfirmText.trim() !== (selectedTenant.company_name || selectedTenant.name)) {
      setDeleteError('Confirmation name does not match agency name exactly.');
      return;
    }
    try {
      setDeleting(true);
      await api.delete(`/tenants/${selectedTenant.id}`);
      setDeleteModalOpen(false);
      showToast('Agency deleted successfully', 'success');
      fetchTenants();
      if (onAgencyUpdated) onAgencyUpdated();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete agency');
    } finally {
      setDeleting(false);
    }
  };

  // Quick Extend Helper
  const quickExtend = (days) => {
    setPlanForm((prev) => {
      let baseDate;
      if (prev.planExpiresAt) {
        baseDate = new Date(prev.planExpiresAt);
        // If the date was in the past, extend from today instead
        if (baseDate.getTime() < Date.now()) {
          baseDate = new Date();
        }
      } else {
        baseDate = new Date();
      }
      baseDate.setDate(baseDate.getDate() + days);
      const newDateStr = baseDate.toISOString().split('T')[0];

      return {
        ...prev,
        planExpiresAt: newDateStr,
        trialExtendedDays: (Number(prev.trialExtendedDays) || 0) + days,
      };
    });
  };

  // Reset Password Helpers
  const generateSecurePassword = () => {
    return `Ezzy@${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const openResetPasswordModal = (tenant) => {
    setResetTenant(tenant);
    setResetPasswordInput(generateSecurePassword());
    setShowPasswordText(false);
    setSendResetEmail(true);
    setResetResult(null);
    setCopiedPassword(false);
    setResetModalOpen(true);
  };

  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTenant) return;
    try {
      setResettingPassword(true);
      const res = await api.post(`/tenants/${resetTenant.id}/reset-password`, {
        customPassword: resetPasswordInput,
        sendEmail: sendResetEmail,
      });
      setResetResult(res.data);
      showToast('Agent password has been reset successfully!');
      fetchTenants();
      if (onAgencyUpdated) onAgencyUpdated();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reset password', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleShareWhatsApp = (creds) => {
    if (!creds) return;
    const phone = creds.phone || resetTenant?.phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Hello ${creds.name || 'Travel Partner'}! 👋\n\n` +
      `Here are your updated login credentials for *${creds.companyName}* on EzzySync Travel CRM:\n\n` +
      `🔗 *Login Portal:* ${creds.loginUrl || 'http://localhost:5173/login'}\n` +
      `👤 *Email:* ${creds.email}\n` +
      `🔑 *New Password:* ${creds.temporaryPassword}\n\n` +
      `You can log in now and manage leads, client itineraries, and quotations. Let us know if you need any assistance!`
    );
    if (!cleanPhone) {
      showToast('No phone number on file for WhatsApp. Please copy credentials.', 'error');
      return;
    }
    window.open(`https://wa.me/${phoneWithCode}?text=${msg}`, '_blank');
  };

  const handleOpenEmailClient = (creds) => {
    if (!creds?.email) return;
    const subject = encodeURIComponent(`EzzySync Travel CRM: Login Credentials for ${creds.companyName}`);
    const body = encodeURIComponent(
      `Hello ${creds.name},\n\n` +
      `Here are your updated login credentials for EzzySync Travel CRM:\n\n` +
      `Login Portal: ${creds.loginUrl || 'http://localhost:5173/login'}\n` +
      `Email: ${creds.email}\n` +
      `New Password: ${creds.temporaryPassword}\n\n` +
      `You can log in now to access your workspace.\n\n` +
      `Best regards,\n` +
      `EzzySync HQ Support Team`
    );
    window.open(`mailto:${creds.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleCopyCredentials = (creds) => {
    const text = `EzzySync Travel CRM Credentials:\nAgency: ${creds.companyName}\nLogin Portal: ${creds.loginUrl || 'http://localhost:5173/login'}\nEmail: ${creds.email}\nPassword: ${creds.temporaryPassword}`;
    navigator.clipboard.writeText(text);
    setCopiedPassword(true);
    showToast('Credentials copied to clipboard!');
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search agencies by company, owner, email, phone..."
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchTenants}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { id: 'all', label: 'All Agencies' },
            { id: 'paid', label: '🟢 Active Paid' },
            { id: 'trial', label: '🟡 Free Trial' },
            { id: 'expired', label: '🔴 Expired' },
            { id: 'paused', label: '⏸️ Paused' },
            { id: 'suspended', label: '⛔ Suspended' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
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
                    <p className="font-semibold">No registered agencies found</p>
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
                            <span className="font-bold text-slate-900 dark:text-zinc-100 truncate block">
                              {tenant.company_name || 'Unnamed Agency'}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate block">
                              {tenant.name}
                            </span>
                            <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                              <span>{tenant.email}</span>
                              {tenant.phone && <span>• {tenant.phone}</span>}
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

                          <div className="text-[11px] font-medium text-slate-600 dark:text-zinc-300">
                            {isSuspended ? (
                              <span className="text-red-600">Access Blocked</span>
                            ) : isPaused ? (
                              <span className="text-slate-500">Subscription on hold</span>
                            ) : tenant.days_left > 0 ? (
                              <span className={tenant.days_left <= 5 ? 'text-amber-600 font-bold' : ''}>
                                {tenant.days_left} {tenant.days_left === 1 ? 'day' : 'days'} left
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold">
                                Expired ({Math.abs(tenant.days_left)}d ago)
                              </span>
                            )}
                          </div>
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
                        </div>
                      </td>

                      {/* Integrations */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                tenant.whatsapp_status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            />
                            <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-300">
                              WA: {tenant.whatsapp_status === 'CONNECTED' ? 'Linked' : 'Not linked'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                tenant.gmail_connected ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            />
                            <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-300">
                              Gmail: {tenant.gmail_connected ? 'Connected' : 'Offline'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {new Date(tenant.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleImpersonate(tenant)}
                            title="1-Click Login as Agency in CRM"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            <Eye size={12} />
                            <span>Login</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openResetPasswordModal(tenant)}
                            title="Reset Agent Password & Share Credentials"
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition cursor-pointer"
                          >
                            <Key size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openPlanModal(tenant)}
                            title="Extend Trial / Change Plan"
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg transition"
                          >
                            <Sliders size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(tenant)}
                            title="Edit Agency Profile"
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg transition"
                          >
                            <Edit size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => open360Drawer(tenant)}
                            title="View Agency 360° Breakdown"
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg transition"
                          >
                            <ChevronRight size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setSuspendModalOpen(true);
                            }}
                            title={tenant.is_suspended ? 'Reactivate' : 'Suspend'}
                            className={`p-1.5 rounded-lg transition ${
                              tenant.is_suspended ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {tenant.is_suspended ? <Unlock size={13} /> : <Lock size={13} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setDeleteConfirmText('');
                              setDeleteModalOpen(true);
                            }}
                            title="Delete Agency"
                            className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg transition"
                          >
                            <Trash2 size={13} />
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

      {/* PLAN & TRIAL MODAL */}
      {planModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  Manage Plan & Subscription
                </h3>
                <p className="text-xs text-slate-500">{selectedTenant.company_name} ({selectedTenant.email})</p>
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
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Plan Override
                </label>
                <select
                  value={planForm.planId}
                  onChange={(e) => setPlanForm({ ...planForm, planId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl"
                >
                  <option value="TRIAL">Free Trial</option>
                  <option value="SOLO">Solo Plan (Paid)</option>
                  <option value="PRO">Pro Plan (Paid)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Quick Trial Bonus Extension
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => quickExtend(7)}
                    className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold"
                  >
                    +7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => quickExtend(14)}
                    className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold"
                  >
                    +14 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => quickExtend(30)}
                    className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold"
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
                    onChange={(e) => setPlanForm({ ...planForm, trialExtendedDays: Number(e.target.value) })}
                    className="w-20 px-2 py-1 bg-slate-50 dark:bg-zinc-950 border rounded text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Custom Expiration Date
                </label>
                <input
                  type="date"
                  value={planForm.planExpiresAt}
                  onChange={(e) => setPlanForm({ ...planForm, planExpiresAt: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                <div>
                  <span className="font-semibold block">Pause Subscription</span>
                  <span className="text-[11px] text-slate-500">Temporarily puts renewal on hold without deleting data.</span>
                </div>
                <input
                  type="checkbox"
                  checked={planForm.isPaused}
                  onChange={(e) => setPlanForm({ ...planForm, isPaused: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  {savingPlan ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {editModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                Edit Agency Profile & Notes
              </h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Company / Agency Name</label>
                <input
                  type="text"
                  required
                  value={editForm.companyName}
                  onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Owner Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Internal Admin Notes 🔒</label>
                <textarea
                  rows={3}
                  value={editForm.adminNotes}
                  onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                  placeholder="Private support notes..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUSPEND MODAL */}
      {suspendModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-base font-bold">
              {selectedTenant.is_suspended ? 'Reactivate Agency Account?' : 'Suspend Agency Account?'}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedTenant.is_suspended
                ? `Restore CRM access for ${selectedTenant.company_name}.`
                : `Suspend ${selectedTenant.company_name} and immediately block all team members from logging into the CRM.`}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuspendModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-slate-600 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={suspending}
                onClick={handleToggleSuspension}
                className={`px-5 py-2 rounded-xl font-bold text-xs text-white ${
                  selectedTenant.is_suspended ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {suspending ? 'Processing...' : selectedTenant.is_suspended ? 'Reactivate' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="text-center">
              <h3 className="text-base font-bold text-rose-600">Permanently Delete Agency?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Type <strong>{selectedTenant.company_name || selectedTenant.name}</strong> to confirm:
              </p>
            </div>
            {deleteError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value);
                setDeleteError('');
              }}
              placeholder={selectedTenant.company_name || selectedTenant.name}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
            />
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting || deleteConfirmText.trim() !== (selectedTenant.company_name || selectedTenant.name)}
                onClick={handleDeleteTenant}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPERSONATE MODAL */}
      {impersonateTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center mx-auto">
              <ExternalLink size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100">
              Inspect Agency Workspace?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              You are about to log into <strong>{impersonateTarget.company_name || impersonateTarget.name}</strong> CRM console in 1-click. You will see their exact live dashboard, pipeline, and itineraries.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setImpersonateTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={impersonating}
                onClick={confirmImpersonate}
                className="px-5 py-2 rounded-xl font-bold text-xs text-white bg-brand-600 hover:bg-brand-500 transition shadow-sm"
              >
                {impersonating ? 'Opening CRM...' : 'Launch Agency CRM ↗'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD & CREDENTIALS DISPATCH MODAL */}
      {resetModalOpen && resetTenant && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                    Reset Agent Password
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set new credentials and dispatch via WhatsApp or Email
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {resetResult ? (
              /* Success Screen */
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2 font-bold text-sm mb-1">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    Password Successfully Reset!
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    The agent's credentials have been updated in the database.
                    {resetResult.emailSent && (
                      <span className="block mt-1 font-semibold">
                        ✉️ Branded credentials email was successfully dispatched to {resetResult.credentials?.email}.
                      </span>
                    )}
                  </p>
                </div>

                {/* Credentials Display Card */}
                <div className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2.5">
                  <div className="flex justify-between items-center text-slate-500 pb-1.5 border-b border-slate-200/60 dark:border-zinc-800">
                    <span>Agency:</span>
                    <strong className="text-slate-900 dark:text-zinc-100">{resetResult.credentials?.companyName}</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 pb-1.5 border-b border-slate-200/60 dark:border-zinc-800">
                    <span>Login Portal:</span>
                    <a href={resetResult.credentials?.loginUrl} target="_blank" rel="noreferrer" className="text-amber-600 hover:underline font-semibold font-mono">
                      {resetResult.credentials?.loginUrl}
                    </a>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 pb-1.5 border-b border-slate-200/60 dark:border-zinc-800">
                    <span>Login Email:</span>
                    <strong className="text-slate-900 dark:text-zinc-100 font-mono">{resetResult.credentials?.email}</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>New Password:</span>
                    <span className="px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold font-mono text-sm tracking-wide">
                      {resetResult.credentials?.temporaryPassword}
                    </span>
                  </div>
                </div>

                {/* Dispatch Action Buttons */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Share Credentials With Agent
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(resetResult.credentials)}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <MessageSquare size={14} />
                      <span>Send on WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEmailClient(resetResult.credentials)}
                      className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <Mail size={14} />
                      <span>Open in Email App</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopyCredentials(resetResult.credentials)}
                      className="flex-1 py-2 px-3 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-semibold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedPassword ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      <span>{copiedPassword ? 'Copied!' : 'Copy Login Details'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResetModalOpen(false)}
                      className="px-5 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-200 font-bold rounded-xl transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Reset Form */
              <form onSubmit={handleConfirmResetPassword} className="space-y-4 text-xs">
                {/* Target Agent Profile Card */}
                <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                      {resetTenant.company_name || resetTenant.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      Agent / Admin
                    </span>
                  </div>
                  <div className="text-slate-500 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                    <span><strong>Owner:</strong> {resetTenant.name}</span>
                    <span><strong>Email:</strong> {resetTenant.email}</span>
                    {resetTenant.phone && <span><strong>Phone:</strong> {resetTenant.phone}</span>}
                  </div>
                </div>

                {/* Password Input with Generate Button */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                    New Password
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPasswordText ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={resetPasswordInput}
                        onChange={(e) => setResetPasswordInput(e.target.value)}
                        placeholder="e.g. Ezzy@2026"
                        className="w-full px-3 py-2 pr-9 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordText(!showPasswordText)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        title={showPasswordText ? 'Hide password' : 'Show password'}
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResetPasswordInput(generateSecurePassword())}
                      className="px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-semibold rounded-xl flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span>Regenerate</span>
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Auto-generated secure password. You can also type a custom password.
                  </span>
                </div>

                {/* Delivery & Dispatch Options */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
                  <span className="font-semibold text-slate-700 dark:text-zinc-300 block">
                    Dispatch Options
                  </span>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 hover:bg-slate-50 dark:hover:bg-zinc-900/50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={sendResetEmail}
                      onChange={(e) => setSendResetEmail(e.target.checked)}
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Mail size={13} className="text-blue-500" />
                        Send New Login Details via Email
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Automatically delivers a branded email to <strong>{resetTenant.email}</strong> with their new password and portal link.
                      </span>
                    </div>
                  </label>

                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={14} className="text-emerald-500" />
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        Send via WhatsApp
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      1-Click Ready on next screen ➔
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold cursor-pointer hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Key size={14} />
                    <span>{resettingPassword ? 'Resetting & Dispatching...' : 'Reset Password'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 360 DRAWER */}
      {drawerOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-zinc-800">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">{selectedTenant.company_name}</h3>
                <p className="text-xs text-slate-500">Owner: {selectedTenant.name} • {selectedTenant.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {drawerLoading ? (
                <div className="py-20 text-center text-slate-400">Loading details...</div>
              ) : drawerData ? (
                <>
                  {/* Account Credentials & Password Reset Card */}
                  <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key size={14} className="text-amber-500" />
                        <span className="font-bold text-slate-800 dark:text-zinc-200">Security & Credentials</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                        Primary Admin
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                      <span><strong>Login Email:</strong> {selectedTenant.email}</span>
                      {selectedTenant.phone && <span><strong>Phone:</strong> {selectedTenant.phone}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openResetPasswordModal(selectedTenant)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Key size={12} />
                        <span>Reset Password</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const cleanPhone = (selectedTenant.phone || '').replace(/[^0-9]/g, '');
                          const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                          const msg = encodeURIComponent(
                            `Hi ${selectedTenant.name}! 👋 Here is your EzzySync Travel CRM login portal: http://localhost:5173/login\nRegistered Email: ${selectedTenant.email}\n\nLet us know if you need assistance logging in!`
                          );
                          window.open(`https://wa.me/${phoneWithCode}?text=${msg}`, '_blank');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <MessageSquare size={12} />
                        <span>Share on WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const subject = encodeURIComponent(`EzzySync Travel CRM Login Details`);
                          const body = encodeURIComponent(
                            `Hi ${selectedTenant.name},\n\nHere is your EzzySync Travel CRM login portal:\nURL: http://localhost:5173/login\nEmail: ${selectedTenant.email}\n\nBest regards,\nTeam EzzySync`
                          );
                          window.open(`mailto:${selectedTenant.email}?subject=${subject}&body=${body}`, '_blank');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Mail size={12} />
                        <span>Email Portal Link</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-[11px] mb-2">Metrics</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-slate-50 dark:bg-zinc-950 border rounded-xl">
                        <span className="text-slate-400 block">Total Bookings</span>
                        <span className="text-base font-bold">{drawerData.metrics?.total_bookings || 0}</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-zinc-950 border rounded-xl">
                        <span className="text-slate-400 block">Total Revenue</span>
                        <span className="text-base font-bold text-emerald-600">₹{Number(drawerData.metrics?.total_revenue || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-[11px] mb-2">Team Members ({drawerData.team?.length || 0})</h4>
                    <div className="divide-y border rounded-xl overflow-hidden bg-slate-50/50">
                      {drawerData.team?.map((m) => (
                        <div key={m.id} className="p-2.5 flex justify-between items-center">
                          <div>
                            <span className="font-bold block">{m.name}</span>
                            <span className="text-slate-400">{m.email}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200">{m.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium transition-all animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-800 shadow-rose-950/50'
              : 'bg-emerald-950 text-emerald-200 border-emerald-800 shadow-emerald-950/50'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
          ) : (
            <Check size={16} className="text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-white p-0.5"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

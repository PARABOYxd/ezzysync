import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Key,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  X,
  Copy,
  ExternalLink,
  Trash2,
  Send,
  Building2,
  Instagram,
  Globe,
  MapPin,
  FileText,
  ZoomIn,
  Eye,
  Check,
  Upload,
  Plus,
  Edit2,
  Save,
  AlertCircle,
  User,
} from 'lucide-react';
import api from '../api';

export default function AccessRequestsTab({ onApproved }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Custom Toast Notification State
  const [toast, setToast] = useState(null);
  const notify = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Active Lead in Verification Drawer
  const [selectedLead, setSelectedLead] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savingVerification, setSavingVerification] = useState(false);

  // Quick Inline Editing States for Admin ('agency_name' | 'name' | 'email' | 'phone' | 'instagram' | 'website' | 'gst')
  const [editingField, setEditingField] = useState(null);

  // Custom Delete Confirmation Modal State
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [deletingLead, setDeletingLead] = useState(false);

  // OTP Verification state inside drawer
  const [lastGeneratedOtp, setLastGeneratedOtp] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  // Image Zoom Modal
  const [zoomImage, setZoomImage] = useState(null);

  // Approval Modal & Form
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveForm, setApproveForm] = useState({
    planId: 'FREE',
    trialDays: 30,
    customPassword: '',
    adminNotes: '',
    overrideVerification: false,
  });
  const [approving, setApproving] = useState(false);
  const [approvedResult, setApprovedResult] = useState(null);

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('Fake profile / Unverifiable travel agency details');
  const [rejecting, setRejecting] = useState(false);

  // Fetch Requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/requests', {
        params: {
          search,
          status: statusFilter,
        },
      });
      const list = res.data.requests || [];
      setRequests(list);

      // Keep selectedLead updated if open
      if (selectedLead) {
        const updated = list.find((item) => item.id === selectedLead.id);
        if (updated) setSelectedLead(updated);
      }
    } catch (err) {
      console.error('Error fetching access requests:', err);
      notify('Failed to fetch requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // Open Drawer for a Lead
  const handleOpenDrawer = (lead) => {
    setSelectedLead(lead);
    setEditingField(null);
    setOtpInput('');
    setLastGeneratedOtp(null);
    setDrawerOpen(true);
  };

  // Save specific field or all details from Admin side
  const handleSaveAdminData = async (fieldsToUpdate) => {
    if (!selectedLead) return;

    // FE Validation
    if (fieldsToUpdate.email !== undefined) {
      const cleanEmail = (fieldsToUpdate.email || '').trim().toLowerCase();
      if (!cleanEmail) {
        notify('Email address cannot be empty', 'error');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        notify('Please enter a valid email address (e.g. name@domain.com)', 'error');
        return;
      }
    }

    try {
      setSavingVerification(true);
      const res = await api.patch(`/requests/${selectedLead.id}/verification`, fieldsToUpdate);
      const updated = res.data.request;
      setSelectedLead(updated);
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );
      setEditingField(null);
      notify('Agency details saved successfully');
    } catch (err) {
      notify(err.response?.data?.error || err.message || 'Failed to save details', 'error');
    } finally {
      setSavingVerification(false);
    }
  };

  // Admin Card Upload Handler
  const handleAdminCardUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      notify('Card file size must be under 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      handleSaveAdminData({ visiting_card_url: reader.result, visiting_card_verified: true });
    };
    reader.readAsDataURL(file);
  };

  // Toggle a verification checklist item
  const handleToggleVerification = async (field, currentValue) => {
    if (!selectedLead) return;
    const newValue = !currentValue;
    try {
      setSavingVerification(true);
      const res = await api.patch(`/requests/${selectedLead.id}/verification`, {
        [field]: newValue,
      });
      const updated = res.data.request;
      setSelectedLead(updated);
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );
      notify(`Verification check updated`);
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to update verification', 'error');
    } finally {
      setSavingVerification(false);
    }
  };

  // Update Admin Notes
  const handleUpdateNotes = async (notes) => {
    if (!selectedLead) return;
    try {
      await api.patch(`/requests/${selectedLead.id}/verification`, {
        admin_notes: notes,
      });
      setSelectedLead((prev) => ({ ...prev, admin_notes: notes }));
    } catch (err) {
      console.error('Failed to update notes:', err);
    }
  };

  // Trigger OTP via Email
  const handleSendOtp = async (leadToOtp = selectedLead) => {
    if (!leadToOtp) return;
    try {
      setSendingOtp(true);
      const res = await api.post(`/requests/${leadToOtp.id}/send-otp`);
      setLastGeneratedOtp(res.data.otp);
      notify(`Verification code sent to ${leadToOtp.email}! Generated Code: ${res.data.otp}`);
      fetchRequests();
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to send OTP', 'error');
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!selectedLead || !otpInput.trim()) return;
    try {
      setVerifyingOtp(true);
      await api.post(`/requests/${selectedLead.id}/verify-otp`, { otp: otpInput.trim() });
      const updated = { ...selectedLead, email_verified: true, status: 'verified' };
      setSelectedLead(updated);
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );
      setOtpInput('');
      notify('Email OTP successfully verified!');
    } catch (err) {
      notify(err.response?.data?.error || 'Invalid OTP code entered', 'error');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Open WhatsApp with prefilled verification intro
  const handleOpenWhatsApp = (lead) => {
    if (!lead.phone) {
      setEditingField('phone');
      notify('Please enter their WhatsApp number first', 'info');
      return;
    }
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Hi ${lead.name || 'there'}! Payal here from EzzySync Travel CRM.\n\nWe received your access request for *${lead.agency_name || 'your agency'}*.\n\nCould you please confirm if you currently organize group tour batches or customized holiday packages? Looking forward to activating your CRM access!`
    );
    window.open(`https://wa.me/${phoneWithCode}?text=${msg}`, '_blank');
  };

  // Open External Link (Instagram or Website)
  const handleOpenSocialLink = (url) => {
    if (!url) return;
    let fullUrl = url.trim();
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = `https://${fullUrl}`;
    }
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  // Open Approve Modal
  const openApproveModal = (lead) => {
    if (lead.status === 'approved') {
      notify('This agency account is already approved and active.', 'info');
      return;
    }
    setSelectedLead(lead);
    const autoPass = `Ezzy@${Math.floor(1000 + Math.random() * 9000)}`;
    setApproveForm({
      planId: 'FREE',
      trialDays: 30,
      customPassword: autoPass,
      adminNotes: lead.admin_notes || 'Verified and approved by EzzySync Super Admin',
      overrideVerification: false,
    });
    setApprovedResult(null);
    setApproveModalOpen(true);
  };

  // Submit Approval
  const handleConfirmApproval = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      setApproving(true);
      const res = await api.post(`/requests/${selectedLead.id}/approve`, approveForm);
      setApprovedResult(res.data);
      notify('Agency account created and approved!');
      fetchRequests();
      if (onApproved) onApproved();
    } catch (err) {
      notify(err.response?.data?.error || 'Verification check required before approval', 'error');
    } finally {
      setApproving(false);
    }
  };

  // Share Approved Credentials on WhatsApp
  const handleShareApprovedWhatsApp = (creds) => {
    if (!creds?.phone) return;
    const cleanPhone = creds.phone.replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Congratulations ${creds.name}! 🎉 Your EzzySync Travel CRM account for *${creds.companyName}* has been verified & approved!\n\n` +
      `🔗 *Login Portal:* http://localhost:5173/login\n` +
      `👤 *Email:* ${creds.email}\n` +
      `🔑 *Temporary Password:* ${creds.temporaryPassword}\n\n` +
      `You can log in now to manage travel leads, automated AI itineraries, and client quotations. Let us know if you need any assistance!`
    );
    window.open(`https://wa.me/${phoneWithCode}?text=${msg}`, '_blank');
  };

  // Submit Rejection
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      setRejecting(true);
      await api.patch(`/requests/${selectedLead.id}/reject`, { reason: rejectReason });
      setRejectModalOpen(false);
      setDrawerOpen(false);
      notify('Request rejected and archived');
      fetchRequests();
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to reject lead', 'error');
    } finally {
      setRejecting(false);
    }
  };

  // Delete Request
  const handleConfirmDelete = async () => {
    if (!leadToDelete) return;
    try {
      setDeletingLead(true);
      await api.delete(`/requests/${leadToDelete.id}`);
      if (selectedLead?.id === leadToDelete.id) setDrawerOpen(false);
      setLeadToDelete(null);
      notify('Request deleted permanently');
      fetchRequests();
    } catch (err) {
      notify('Failed to delete request', 'error');
    } finally {
      setDeletingLead(false);
    }
  };

  // Calculate Verification Score (0 to 4)
  const getVerificationScore = (lead) => {
    let score = 0;
    if (lead.email_verified || lead.status === 'verified' || lead.status === 'approved') score++;
    if (lead.whatsapp_verified) score++;
    if (lead.social_verified) score++;
    if (lead.visiting_card_verified) score++;
    return score;
  };

  return (
    <div className="space-y-4">
      {/* Sleek Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-3 duration-200">
          {toast.type === 'error' ? (
            <AlertCircle size={18} className="text-rose-500 shrink-0" />
          ) : toast.type === 'info' ? (
            <Clock size={18} className="text-amber-500 shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          )}
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">{toast.message}</span>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads by agency name, applicant, email, phone..."
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
              onClick={fetchRequests}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'pending', label: '🟡 Pending Verification' },
            { id: 'verified', label: '🟢 Verified Proof' },
            { id: 'approved', label: '✅ Approved & Created' },
            { id: 'rejected', label: '🔴 Rejected' },
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

      {/* Access Requests Table */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/75 dark:bg-zinc-950/50 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-zinc-400">
                <th className="py-3 px-4">Applicant & Agency</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Online Proof & Card</th>
                <th className="py-3 px-4">Verification Score</th>
                <th className="py-3 px-4">Safety Check</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Verification & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading access requests...</span>
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-zinc-400">
                    <Building2 size={32} className="mx-auto text-slate-300 dark:text-zinc-700 mb-2" />
                    <p className="font-semibold">No access requests found</p>
                    <p className="text-[11px] mt-0.5">New registration requests with visiting cards and Instagram links will appear here.</p>
                  </td>
                </tr>
              ) : (
                requests.map((lead) => {
                  const score = getVerificationScore(lead);
                  const isApproved = lead.status === 'approved';
                  const isRejected = lead.status === 'rejected';

                  // Links resolution
                  const igLink = lead.instagram_link || (lead.website_or_instagram && lead.website_or_instagram.includes('instagram') ? lead.website_or_instagram : '');
                  const webLink = lead.website_link || (lead.website_or_instagram && !lead.website_or_instagram.includes('instagram') ? lead.website_or_instagram : '');

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition group cursor-pointer"
                      onClick={() => handleOpenDrawer(lead)}
                    >
                      {/* Applicant & Agency */}
                      <td className="py-3.5 px-4 max-w-[210px]">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-xs flex items-center justify-center shrink-0 uppercase shadow-xs">
                            {(lead.agency_name || lead.name || 'A')[0]}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-zinc-100 truncate block">
                              {lead.agency_name || 'Unnamed Agency'}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate block">
                              {lead.name}
                            </span>
                            {lead.gst_number && (
                              <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                                GST: {lead.gst_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-200">
                            <Mail size={11} className="text-slate-400" />
                            <span>{lead.email}</span>
                          </div>
                          {lead.phone ? (
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400">
                              <Phone size={11} className="text-slate-400" />
                              <span>{lead.phone}</span>
                            </div>
                          ) : (
                            <span className="text-amber-500 dark:text-amber-400 text-[10px] font-semibold flex items-center gap-1">
                              <Plus size={10} /> No phone provided
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Online Proof & Card */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Instagram Link */}
                          {igLink ? (
                            <button
                              type="button"
                              onClick={() => handleOpenSocialLink(igLink)}
                              title={`Instagram: ${igLink}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 font-bold text-[10px] transition cursor-pointer"
                            >
                              <Instagram size={11} />
                              <span>Instagram ↗</span>
                            </button>
                          ) : null}

                          {/* Website Link */}
                          {webLink ? (
                            <button
                              type="button"
                              onClick={() => handleOpenSocialLink(webLink)}
                              title={`Website: ${webLink}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold text-[10px] transition cursor-pointer"
                            >
                              <Globe size={11} />
                              <span>Website ↗</span>
                            </button>
                          ) : null}

                          {/* Visiting Card Badge */}
                          {lead.visiting_card_url ? (
                            <button
                              type="button"
                              onClick={() => setZoomImage(lead.visiting_card_url)}
                              title="Click to zoom Visiting Card"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-[10px] transition cursor-pointer"
                            >
                              <FileText size={11} />
                              <span>Card 🪪</span>
                            </button>
                          ) : (
                            !igLink && !webLink && <span className="text-[10px] text-slate-400 italic">No proof added</span>
                          )}
                        </div>
                      </td>

                      {/* Verification Score */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isApproved || score === 4
                                  ? 'bg-emerald-500 w-full'
                                  : score >= 2
                                  ? 'bg-amber-500 w-3/4'
                                  : score === 1
                                  ? 'bg-blue-500 w-1/4'
                                  : 'bg-slate-300 w-0'
                              }`}
                            />
                          </div>
                          <span
                            className={`font-mono font-bold text-[11px] ${
                              isApproved || score >= 3
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : score >= 1
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {isApproved ? '4/4 Verified' : `${score}/4 Checks`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400 font-medium">
                          <span className={isApproved || lead.email_verified ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                            ✉ {isApproved || lead.email_verified ? 'OTP✓' : 'OTP'}
                          </span>
                          <span>•</span>
                          <span className={lead.whatsapp_verified ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                            💬 {lead.whatsapp_verified ? 'WA✓' : 'WA'}
                          </span>
                          <span>•</span>
                          <span className={lead.social_verified ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                            🌐 {lead.social_verified ? 'IG✓' : 'IG'}
                          </span>
                          <span>•</span>
                          <span className={lead.visiting_card_verified ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                            🪪 {lead.visiting_card_verified ? 'Card✓' : 'Card'}
                          </span>
                        </div>
                      </td>

                      {/* Safety / Duplicate Check */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 size={10} /> CRM Tenant Active
                          </span>
                        ) : lead.already_registered_email ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-bold text-[10px]">
                            <AlertTriangle size={10} /> Duplicate Email
                          </span>
                        ) : lead.already_registered_phone ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold text-[10px]">
                            <AlertTriangle size={10} /> Duplicate Phone
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-bold text-[10px]">
                            <CheckCircle2 size={10} /> Fresh New Lead
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                            <CheckCircle2 size={10} /> Account Live
                          </span>
                        ) : lead.status === 'verified' || score >= 3 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300 dark:border-emerald-800">
                            <ShieldCheck size={10} /> Verified Ready
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 font-bold text-[10px]">
                            <XCircle size={10} /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold text-[10px]">
                            <Clock size={10} /> Needs Verification
                          </span>
                        )}
                      </td>

                      {/* Verification & Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
                          {/* Main Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDrawer(lead)}
                            title={isApproved ? 'View agency details' : 'Open full Super Admin verification drawer'}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                              isApproved
                                ? 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200'
                                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white'
                            }`}
                          >
                            {isApproved ? <Eye size={12} /> : <ShieldCheck size={12} />}
                            <span>{isApproved ? 'View Details' : 'Review & Verify'}</span>
                          </button>

                          {/* Quick WhatsApp Connect */}
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(lead)}
                            title="Chat on WhatsApp"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition cursor-pointer"
                          >
                            <MessageSquare size={14} />
                          </button>

                          {/* Delete Lead */}
                          <button
                            type="button"
                            onClick={() => setLeadToDelete(lead)}
                            title="Delete request"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
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

      {/* ============================================================== */}
      {/* SUPER ADMIN VERIFICATION DRAWER (THE VERIFICATION CONSOLE)     */}
      {/* ============================================================== */}
      {drawerOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-3xl h-full bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer Top Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-sm flex items-center justify-center uppercase shadow-sm">
                  {(selectedLead.agency_name || selectedLead.name || 'A')[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-zinc-100 font-display">
                      {selectedLead.agency_name || 'Travel Agency Verification'}
                    </h2>
                    {selectedLead.status === 'approved' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                        ✅ CRM Account Live
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          getVerificationScore(selectedLead) === 4
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}
                      >
                        {getVerificationScore(selectedLead)}/4 Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Applicant: <strong>{selectedLead.name}</strong> • Requested on {new Date(selectedLead.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp(selectedLead)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <MessageSquare size={13} />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Alert: Verification Requirement Guideline */}
              {selectedLead.status === 'approved' ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                    <span className="font-bold block">Account Active in EzzySync CRM</span>
                    This agency has been verified and their tenant account was created. You can update or add optional proof details anytime below.
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                  <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    <span className="font-bold block">Super Admin Agency Verification</span>
                    Review their proof details below. If the applicant didn't provide their visiting card, Instagram, or phone number in the initial form, you can add or upload them directly below.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* ========================================================= */}
                {/* LEFT COLUMN: SUBMITTED PROOF & FOOTPRINT                  */}
                {/* ========================================================= */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileText size={13} />
                      <span>Business Proof & Footprint</span>
                    </h3>
                  </div>

                  {/* 1. Agency & Applicant Profile (Company Name, Owner Name, Email) */}
                  <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3.5 shadow-xs">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-zinc-800">
                      <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <Building2 size={14} className="text-amber-500" />
                        Agency & Applicant Details
                      </span>
                    </div>

                    {/* Agency / Company Name */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
                          <Building2 size={11} className="text-slate-400" />
                          Agency / Company Name
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingField(editingField === 'agency_name' ? null : 'agency_name')}
                          className="text-[10px] font-bold text-amber-600 hover:text-amber-500 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={10} />
                          <span>{editingField === 'agency_name' ? 'Close' : 'Edit'}</span>
                        </button>
                      </div>
                      {editingField === 'agency_name' ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            defaultValue={selectedLead.agency_name || ''}
                            id="inline-agency-name-input"
                            placeholder="e.g. Sharma Holidays"
                            className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = document.getElementById('inline-agency-name-input')?.value;
                              if (val) handleSaveAdminData({ agency_name: val });
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingField(null)}
                            className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-extrabold text-slate-900 dark:text-zinc-100 font-display">
                          {selectedLead.agency_name || 'Not provided'}
                        </div>
                      )}
                    </div>

                    {/* Applicant / Owner Name */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
                          <User size={11} className="text-slate-400" />
                          Applicant / Owner Name
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingField(editingField === 'name' ? null : 'name')}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={10} />
                          <span>{editingField === 'name' ? 'Close' : 'Edit'}</span>
                        </button>
                      </div>
                      {editingField === 'name' ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            defaultValue={selectedLead.name || ''}
                            id="inline-owner-name-input"
                            placeholder="e.g. Rohit Sharma"
                            className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-blue-300 dark:border-blue-800 rounded-xl text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = document.getElementById('inline-owner-name-input')?.value;
                              if (val) handleSaveAdminData({ name: val });
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingField(null)}
                            className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-800 dark:text-zinc-200">
                          {selectedLead.name || 'Not provided'}
                        </div>
                      )}
                    </div>

                    {/* Official Work Email Address */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
                          <Mail size={11} className="text-slate-400" />
                          Official Work Email
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingField(editingField === 'email' ? null : 'email')}
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={10} />
                          <span>{editingField === 'email' ? 'Close' : 'Edit'}</span>
                        </button>
                      </div>
                      {editingField === 'email' ? (
                        <div className="flex gap-2">
                          <input
                            type="email"
                            defaultValue={selectedLead.email || ''}
                            id="inline-email-profile-input"
                            placeholder="e.g. contact@agency.com"
                            className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = document.getElementById('inline-email-profile-input')?.value;
                              if (val) handleSaveAdminData({ email: val });
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingField(null)}
                            className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-slate-800 dark:text-zinc-200 truncate flex items-center justify-between">
                          <span className="truncate">{selectedLead.email || 'Not provided'}</span>
                          {selectedLead.email_verified && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full shrink-0">
                              ✓ Verified
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 1. Visiting Card / Business ID Preview (🪪) */}
                  <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <FileText size={14} className="text-blue-500" />
                        Visiting Card / Business Proof
                      </span>

                      <div className="flex items-center gap-2">
                        {selectedLead.visiting_card_url ? (
                          <button
                            type="button"
                            onClick={() => setZoomImage(selectedLead.visiting_card_url)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1 cursor-pointer"
                          >
                            <ZoomIn size={12} />
                            <span>Enlarge</span>
                          </button>
                        ) : null}

                        {/* Admin Direct Card Upload */}
                        <label className="text-[11px] font-bold text-amber-600 hover:text-amber-500 flex items-center gap-1 cursor-pointer bg-amber-500/10 px-2 py-0.5 rounded-md transition">
                          <Upload size={11} />
                          <span>{selectedLead.visiting_card_url ? 'Replace' : 'Upload Card'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleAdminCardUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {selectedLead.visiting_card_url ? (
                      <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
                        <img
                          src={selectedLead.visiting_card_url}
                          alt="Visiting Card"
                          className="w-full h-44 object-cover object-center cursor-pointer hover:scale-102 transition duration-200"
                          onClick={() => setZoomImage(selectedLead.visiting_card_url)}
                        />
                        <div
                          className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer"
                          onClick={() => setZoomImage(selectedLead.visiting_card_url)}
                        >
                          <span className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-bold shadow-md flex items-center gap-1.5">
                            <Eye size={13} /> View Full Card
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center p-4 text-center text-slate-400 space-y-2">
                        <FileText size={22} className="text-slate-300 dark:text-zinc-700" />
                        <span className="text-xs font-semibold">No Visiting Card Attached</span>
                        <label className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition">
                          <Upload size={12} />
                          <span>Upload Card From PC / WhatsApp</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleAdminCardUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* 2. Instagram Profile Link */}
                  <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <Instagram size={14} className="text-purple-500" />
                        Instagram Profile
                      </span>
                      {selectedLead.instagram_link && (
                        <button
                          type="button"
                          onClick={() => setEditingField(editingField === 'instagram' ? null : 'instagram')}
                          className="text-[11px] font-bold text-purple-600 hover:text-purple-500 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={11} />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    {editingField === 'instagram' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. instagram.com/sharma_holidays"
                          defaultValue={selectedLead.instagram_link || ''}
                          id="inline-instagram-input"
                          className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-purple-300 dark:border-purple-800 rounded-xl text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = document.getElementById('inline-instagram-input')?.value;
                            handleSaveAdminData({ instagram_link: val });
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingField(null)}
                          className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (selectedLead.instagram_link || (selectedLead.website_or_instagram && selectedLead.website_or_instagram.includes('instagram'))) ? (
                      <div className="p-3 bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-900/40 rounded-xl space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-300 truncate">
                            {selectedLead.instagram_link || selectedLead.website_or_instagram}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenSocialLink(selectedLead.instagram_link || selectedLead.website_or_instagram)}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                          >
                            <span>Open Profile</span>
                            <ExternalLink size={12} />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Confirm if they actively post tour batches, traveller photos & client reviews.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-100 dark:bg-zinc-900/60 rounded-xl flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-400 italic text-[11px]">No Instagram profile link.</span>
                        <button
                          type="button"
                          onClick={() => setEditingField('instagram')}
                          className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 font-bold text-[11px] rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={11} /> Add Instagram
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3. Company Website Link */}
                  <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <Globe size={14} className="text-blue-500" />
                        Official Website Link
                      </span>
                      {selectedLead.website_link && (
                        <button
                          type="button"
                          onClick={() => setEditingField(editingField === 'website' ? null : 'website')}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={11} />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    {editingField === 'website' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. https://sharmaholidays.com"
                          defaultValue={selectedLead.website_link || ''}
                          id="inline-website-input"
                          className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-blue-300 dark:border-blue-800 rounded-xl text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = document.getElementById('inline-website-input')?.value;
                            handleSaveAdminData({ website_link: val });
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingField(null)}
                          className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (selectedLead.website_link || (selectedLead.website_or_instagram && !selectedLead.website_or_instagram.includes('instagram'))) ? (
                      <div className="p-3 bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-900/40 rounded-xl space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 truncate">
                            {selectedLead.website_link || selectedLead.website_or_instagram}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenSocialLink(selectedLead.website_link || selectedLead.website_or_instagram)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                          >
                            <span>Visit Website</span>
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-100 dark:bg-zinc-900/60 rounded-xl flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-400 italic text-[11px]">No website link.</span>
                        <button
                          type="button"
                          onClick={() => setEditingField('website')}
                          className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold text-[11px] rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={11} /> Add Website
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 4. GSTIN Number */}
                  <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">GST Number (Optional):</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                        {selectedLead.gst_number || 'Not provided'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedLead.gst_number ? (
                        <button
                          type="button"
                          onClick={() => window.open(`https://services.gst.gov.in/services/searchtp`, '_blank')}
                          className="text-[10px] font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Verify GST</span>
                          <ExternalLink size={10} />
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setEditingField(editingField === 'gst' ? null : 'gst')}
                        className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-md cursor-pointer"
                      >
                        {selectedLead.gst_number ? 'Edit GST' : '+ Add GST'}
                      </button>
                    </div>
                  </div>

                  {/* Inline GST Edit Input */}
                  {editingField === 'gst' && (
                    <div className="flex gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                      <input
                        type="text"
                        placeholder="e.g. 08AABCS1429B1Z8"
                        defaultValue={selectedLead.gst_number || ''}
                        id="inline-gst-input"
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = document.getElementById('inline-gst-input')?.value;
                          handleSaveAdminData({ gst_number: val });
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingField(null)}
                        className="px-2.5 py-1.5 text-xs text-slate-500 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* ========================================================= */}
                {/* RIGHT COLUMN: 4-POINT SUPER ADMIN CHECKLIST               */}
                {/* ========================================================= */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-emerald-500" />
                      <span>Verification Checklist</span>
                    </h3>
                    <span className="text-[11px] font-bold text-slate-500">
                      Score: {getVerificationScore(selectedLead)} / 4
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* CHECK #1: Email OTP Verification */}
                    <div
                      className={`p-3.5 rounded-2xl border transition ${
                        selectedLead.email_verified || selectedLead.status === 'approved'
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              selectedLead.email_verified || selectedLead.status === 'approved'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'
                            }`}
                          >
                            <Mail size={12} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                                1. Work Email OTP Status
                              </span>
                              {selectedLead.email_verified || selectedLead.status === 'approved' ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                  <Check size={11} /> Verified
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-600 font-bold">Pending</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500 block font-mono">
                                {selectedLead.email}
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingField(editingField === 'email' ? null : 'email')}
                                className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                                title="Edit Email Address"
                              >
                                <Edit2 size={10} />
                              </button>
                            </div>
                            {editingField === 'email' && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <input
                                  type="email"
                                  defaultValue={selectedLead.email}
                                  id="inline-edit-email"
                                  placeholder="applicant@agency.com"
                                  className="px-2 py-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs flex-1"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const val = document.getElementById('inline-edit-email')?.value?.trim();
                                    if (val) handleSaveAdminData({ email: val });
                                  }}
                                  className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-lg text-xs cursor-pointer hover:bg-amber-500"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingField(null)}
                                  className="px-2 py-1 border rounded-lg text-xs text-slate-500 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {selectedLead.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleToggleVerification('email_verified', selectedLead.email_verified)}
                            disabled={savingVerification}
                            className={`text-xs font-bold px-2 py-1 rounded-lg transition cursor-pointer ${
                              selectedLead.email_verified
                                ? 'text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200'
                            }`}
                          >
                            {selectedLead.email_verified ? 'Toggle Off' : 'Mark Verified'}
                          </button>
                        )}
                      </div>

                      {/* Inline OTP Generator if pending */}
                      {!selectedLead.email_verified && selectedLead.status !== 'approved' && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSendOtp(selectedLead)}
                            disabled={sendingOtp}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer"
                          >
                            {sendingOtp ? 'Sending...' : 'Send OTP'}
                          </button>
                          <input
                            type="text"
                            placeholder="Enter 6-digit OTP"
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                            maxLength={6}
                            className="flex-1 py-1 px-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-mono text-center tracking-widest focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={verifyingOtp || !otpInput.trim()}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold transition shrink-0 shadow-xs cursor-pointer"
                          >
                            {verifyingOtp ? 'Verifying...' : 'Verify'}
                          </button>
                        </div>
                      )}
                      {lastGeneratedOtp && !selectedLead.email_verified && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 block mt-1 font-mono">
                          Generated OTP: <strong>{lastGeneratedOtp}</strong>
                        </span>
                      )}
                    </div>

                    {/* CHECK #2: WhatsApp Active Check */}
                    <div
                      className={`p-3.5 rounded-2xl border transition ${
                        selectedLead.whatsapp_verified
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              selectedLead.whatsapp_verified
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'
                            }`}
                          >
                            <MessageSquare size={12} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                                2. WhatsApp Number Check
                              </span>
                              {selectedLead.whatsapp_verified ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                  <Check size={11} /> Active
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold">Unchecked</span>
                              )}
                            </div>

                            {/* Phone display / inline phone add */}
                            {selectedLead.phone ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-500 block font-mono">
                                  {selectedLead.phone}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingField(editingField === 'phone' ? null : 'phone')}
                                  className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                  <Edit2 size={10} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditingField('phone')}
                                className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                              >
                                <Plus size={10} /> + Add WhatsApp Number
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(selectedLead)}
                            className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare size={14} />
                          </button>
                          {selectedLead.status !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleToggleVerification('whatsapp_verified', selectedLead.whatsapp_verified)}
                              disabled={savingVerification}
                              className={`text-xs font-bold px-2 py-1 rounded-lg transition cursor-pointer ${
                                selectedLead.whatsapp_verified
                                  ? 'text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200'
                              }`}
                            >
                              {selectedLead.whatsapp_verified ? 'Toggle Off' : 'Mark Verified'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline Phone Edit Input */}
                      {editingField === 'phone' && (
                        <div className="flex gap-2 p-2 mt-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                          <input
                            type="tel"
                            placeholder="Enter 10-digit mobile number"
                            defaultValue={selectedLead.phone || ''}
                            id="inline-phone-input"
                            className="flex-1 px-3 py-1 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = document.getElementById('inline-phone-input')?.value;
                              handleSaveAdminData({ phone: val });
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingField(null)}
                            className="px-2 py-1 text-xs text-slate-500 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* CHECK #3: Instagram / Website Authenticity */}
                    <div
                      className={`p-3.5 rounded-2xl border transition ${
                        selectedLead.social_verified
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              selectedLead.social_verified
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'
                            }`}
                          >
                            <Globe size={12} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                                3. Instagram / Website Proof
                              </span>
                              {selectedLead.social_verified ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                  <Check size={11} /> Real Travel Co.
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold">Pending Review</span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 block truncate max-w-[200px]">
                              {selectedLead.instagram_link || selectedLead.website_link || selectedLead.website_or_instagram || 'No profile link provided'}
                            </span>
                          </div>
                        </div>

                        {selectedLead.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleToggleVerification('social_verified', selectedLead.social_verified)}
                            disabled={savingVerification}
                            className={`text-xs font-bold px-2 py-1 rounded-lg transition cursor-pointer ${
                              selectedLead.social_verified
                                ? 'text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200'
                            }`}
                          >
                            {selectedLead.social_verified ? 'Toggle Off' : 'Confirm Real'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* CHECK #4: Visiting Card / Business Legitimacy */}
                    <div
                      className={`p-3.5 rounded-2xl border transition ${
                        selectedLead.visiting_card_verified
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              selectedLead.visiting_card_verified
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'
                            }`}
                          >
                            <FileText size={12} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                                4. Visiting Card Authenticity
                              </span>
                              {selectedLead.visiting_card_verified ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                  <Check size={11} /> Card Matched
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold">Pending Review</span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 block">
                              {selectedLead.visiting_card_url ? 'Card photo reviewed' : 'Card not provided'}
                            </span>
                          </div>
                        </div>

                        {selectedLead.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleToggleVerification('visiting_card_verified', selectedLead.visiting_card_verified)}
                            disabled={savingVerification}
                            className={`text-xs font-bold px-2 py-1 rounded-lg transition cursor-pointer ${
                              selectedLead.visiting_card_verified
                                ? 'text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200'
                            }`}
                          >
                            {selectedLead.visiting_card_verified ? 'Toggle Off' : 'Confirm Authentic'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Internal Admin Notes */}
                  <div className="space-y-1.5 pt-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Internal Admin Notes
                    </label>
                    <textarea
                      rows={2}
                      defaultValue={selectedLead.admin_notes || ''}
                      onBlur={(e) => handleUpdateNotes(e.target.value)}
                      placeholder="e.g. Verified tour packages on Instagram, talked on phone, genuine agency..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Bottom Action Bar */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {selectedLead.status === 'approved' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 size={16} /> CRM Account Provisioned & Ready
                  </span>
                ) : getVerificationScore(selectedLead) >= 3 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 size={16} /> All Primary Checks Verified!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <AlertTriangle size={15} /> Complete verification checklist before approving
                  </span>
                )}
              </div>

              {selectedLead.status === 'approved' ? (
                /* Already Approved: Show active badge and WhatsApp contact */
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <div className="px-4 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-2 shadow-xs">
                    <CheckCircle2 size={15} />
                    <span>CRM Account Active</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp(selectedLead)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <MessageSquare size={13} />
                    <span>Chat on WhatsApp</span>
                  </button>
                </div>
              ) : (
                /* Pending / Unapproved: Show Reject and Approve Buttons */
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold transition cursor-pointer"
                  >
                    Reject & Mark Fake
                  </button>
                  <button
                    type="button"
                    onClick={() => openApproveModal(selectedLead)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md ${
                      getVerificationScore(selectedLead) >= 2 || selectedLead.email_verified
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer'
                        : 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                    }`}
                  >
                    <ShieldCheck size={15} />
                    <span>Approve & Grant CRM Access</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* IMAGE ZOOM MODAL                                               */}
      {/* ============================================================== */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-3 border-b border-slate-100 dark:border-zinc-800">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                Visiting Card / Business Proof (Inspect Address & Contact)
              </span>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img src={zoomImage} alt="Visiting Card Zoom" className="max-w-full max-h-[72vh] object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CUSTOM DELETE CONFIRMATION MODAL (NO WINDOW.CONFIRM)           */}
      {/* ============================================================== */}
      {leadToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Delete Access Request</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Are you sure you want to permanently delete the request for <strong>{leadToDelete.agency_name || leadToDelete.name}</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLeadToDelete(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingLead}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs cursor-pointer transition"
              >
                {deletingLead ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* APPROVAL & ACCOUNT PROVISIONING MODAL                          */}
      {/* ============================================================== */}
      {approveModalOpen && selectedLead && selectedLead.status !== 'approved' && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-500" />
                  Approve & Create Agency Account
                </h3>
                <p className="text-xs text-slate-500">
                  Provisions verified tenant in EzzySync CRM and activates credentials
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {approvedResult ? (
              /* Success & Share Credentials View */
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2 font-bold text-sm mb-1">
                    <CheckCircle2 size={18} />
                    Account Successfully Created & Verified!
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    The agency is now live in the CRM database.
                    {approvedResult.emailSent && (
                      <span className="block mt-1 font-semibold">
                        ✉️ Welcome & credentials email was automatically sent to {approvedResult.credentials?.email}.
                      </span>
                    )}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Agency:</span>
                    <span className="font-bold">{approvedResult.credentials?.companyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Login Email:</span>
                    <span className="font-bold">{approvedResult.credentials?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Password:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{approvedResult.credentials?.temporaryPassword}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">CRM URL:</span>
                    <span className="text-slate-500">{approvedResult.credentials?.loginUrl}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleShareApprovedWhatsApp(approvedResult.credentials)}
                    className="w-full sm:flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    <span>Send on WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const creds = approvedResult.credentials;
                      if (!creds?.email) return;
                      const subject = encodeURIComponent(`Welcome to EzzySync CRM: Login Details for ${creds.companyName}`);
                      const body = encodeURIComponent(
                        `Hi ${creds.name}!\n\nCongratulations! Your EzzySync Travel CRM account for ${creds.companyName} is ready.\n\nLogin Portal: ${creds.loginUrl}\nEmail: ${creds.email}\nPassword: ${creds.temporaryPassword}\n\nBest regards,\nEzzySync HQ`
                      );
                      window.open(`mailto:${creds.email}?subject=${subject}&body=${body}`, '_blank');
                    }}
                    className="w-full sm:flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Mail size={14} />
                    <span>Open in Email</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `EzzySync CRM Login Details:\nURL: ${approvedResult.credentials?.loginUrl}\nEmail: ${approvedResult.credentials?.email}\nPassword: ${approvedResult.credentials?.temporaryPassword}`
                      );
                      notify('Credentials copied to clipboard!');
                    }}
                    className="w-full sm:w-auto py-2.5 px-3.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-200 font-semibold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Copy size={14} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Approval Form */
              <form onSubmit={handleConfirmApproval} className="space-y-3.5 text-xs">
                {/* Agency Summary */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-zinc-100 block">
                      {selectedLead.agency_name}
                    </span>
                    <span className="text-[11px] text-slate-500">{selectedLead.name} • {selectedLead.email}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                    {getVerificationScore(selectedLead)}/4 Verified
                  </span>
                </div>

                {/* Verification Warning if score is 0 */}
                {getVerificationScore(selectedLead) === 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
                    <span className="font-bold block mb-1">⚠️ Proper Verification Guard</span>
                    You have not marked any verification checks yet. To approve anyway, check the manual override box below.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                      Subscription Plan
                    </label>
                    <select
                      value={approveForm.planId}
                      onChange={(e) => setApproveForm({ ...approveForm, planId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                    >
                      <option value="FREE">Free Trial (Default)</option>
                      <option value="SOLO">Solo Plan (Paid)</option>
                      <option value="PRO">Pro Plan (Paid)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                      Trial Duration (Days)
                    </label>
                    <input
                      type="number"
                      min="7"
                      max="180"
                      value={approveForm.trialDays}
                      onChange={(e) => setApproveForm({ ...approveForm, trialDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Auto-Generated Initial Password
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={approveForm.customPassword}
                      onChange={(e) => setApproveForm({ ...approveForm, customPassword: e.target.value })}
                      className="flex-1 font-mono font-bold px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setApproveForm({ ...approveForm, customPassword: `Ezzy@${Math.floor(1000 + Math.random() * 9000)}` })}
                      className="px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 rounded-xl font-bold cursor-pointer"
                    >
                      Regenerate
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    The agent will use this password to log in. They can change it inside their profile.
                  </span>
                </div>

                {/* Manual Override Checkbox if unverified */}
                {getVerificationScore(selectedLead) === 0 && (
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approveForm.overrideVerification}
                      onChange={(e) => setApproveForm({ ...approveForm, overrideVerification: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-700 dark:text-zinc-300 font-semibold">
                      I have personally verified this agency via direct call / personal relationship
                    </span>
                  </label>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setApproveModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={approving || (getVerificationScore(selectedLead) === 0 && !approveForm.overrideVerification)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {approving ? 'Creating Tenant...' : 'Approve & Create Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* REJECT MODAL                                                   */}
      {/* ============================================================== */}
      {rejectModalOpen && selectedLead && selectedLead.status !== 'approved' && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                Reject Access Request
              </h3>
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Reason for Rejection
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-xs cursor-pointer"
                >
                  {rejecting ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

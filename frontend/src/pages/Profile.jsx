import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as profileService from '../services/profileService';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import Input from '../components/ui/Input.jsx';
import FormRow from '../components/ui/FormRow.jsx';
import Button from '../components/ui/Button.jsx';
import { 
  User, Mail, Building2, Lock, ShieldCheck, Key,
  Crown, CheckCircle2, XCircle, ArrowUpRight, Sparkles, 
  Users, MessageSquare, Map, FileText, CalendarCheck, Check, X 
} from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const toast = useToast();

  const totalTrialDays = Number(user?.trialDays || import.meta.env.VITE_TRIAL_DAYS || 30);
  const registrationDate = user?.createdAt ? new Date(user.createdAt) : new Date();
  const daysPassed = Math.floor((Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, totalTrialDays - daysPassed);
  const isPaidPro = user?.planId === 'PRO_ACTIVE' || user?.planId === 'PRO';
  const isSolo = user?.planId === 'SOLO';
  const isTrial = !isPaidPro && !isSolo && daysRemaining > 0;
  const isExpired = !isPaidPro && !isSolo && daysRemaining === 0;

  useEffect(() => {
    profileService.getProfile().then(setProfile).catch(() => toast.error('Could not load profile.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const updated = await profileService.updateProfile({ name: profile.name, companyName: profile.companyName });
      setProfile(updated);
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (ev) => {
    ev.preventDefault();
    setPwSaving(true);
    try {
      await profileService.changePassword(pwForm);
      toast.success('Password updated.');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change password.');
    } finally {
      setPwSaving(false);
    }
  };

  if (!profile) return (
    <div className="max-w-3xl space-y-6">
      <div className="skeleton h-64 rounded-2xl w-full" />
      <div className="skeleton h-64 rounded-2xl w-full" />
    </div>
  );

  return (
    <div className="max-w-3xl space-y-8 pb-10">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Account Settings</h1>
        <p className="text-sm text-slate-500">Manage your personal profile, company details, and security preferences.</p>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="card p-0 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xl font-bold uppercase ring-4 ring-white shadow-sm">
            {profile.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">Personal Information</h3>
            <p className="text-xs text-slate-500">Update your name and primary agency details.</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <FormRow>
            <Input
              label="Full Name"
              icon={User}
              required
              placeholder="e.g. Rishab Jain"
              hint="Your display name across the dashboard"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
            <Input
              label="Email Address (read-only)"
              icon={Mail}
              placeholder="Login email"
              value={profile.email}
              disabled
              hint="Primary login email — cannot be changed"
            />
          </FormRow>

          <Input
            label="Company Name"
            icon={Building2}
            placeholder="e.g. TravelGo Holidays Pvt Ltd"
            hint={isAdmin ? "Your official agency name" : "Only administrators can change the company name"}
            value={profile.companyName}
            disabled={!isAdmin}
            onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
          />

          <div className="flex justify-end pt-4 border-t border-slate-100 mt-2">
            <Button type="submit" disabled={saving} className="px-6">
              {saving ? 'Saving Changes…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>

      {/* Active Subscription & Plan Entitlements */}
      <div className="card p-0 overflow-hidden border border-slate-200 dark:border-zinc-800">
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent dark:from-amber-500/5 dark:via-orange-500/5 border-b border-slate-100 dark:border-zinc-800 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center">
              <Crown size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-base flex items-center gap-2">
                Active Subscription & Features
                {isTrial && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                    Pro 30-Day Free Trial
                  </span>
                )}
                {isPaidPro && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                    Pro Plan (Active)
                  </span>
                )}
                {isSolo && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                    Solo Agent Plan
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {isTrial ? `You currently have full Pro agency access active for free. (30-day trial ends in ${daysRemaining} days)` : isPaidPro ? 'Full Agency Growth Pro access active with unlimited bookings.' : isSolo ? 'Solo Agent plan active (1 login, 200 bookings limit).' : 'Trial has ended. Upgrade to unlock all features.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUpgradeModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            Upgrade / Manage <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Feature 1 */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Users size={14} className="text-emerald-500" /> Team Logins
                </span>
                <CheckCircle2 size={15} className="text-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                {isSolo ? '1 Solo Login' : 'Up to 5 Team Logins'}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <CalendarCheck size={14} className="text-emerald-500" /> Bookings & Leads
                </span>
                <CheckCircle2 size={15} className="text-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                {isSolo ? '200 Active Limit' : 'Unlimited Bookings'}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" /> AI Travel Tools
                </span>
                {isSolo ? <XCircle size={15} className="text-slate-400" /> : <CheckCircle2 size={15} className="text-emerald-500" />}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                {isSolo ? 'Locked (Pro only)' : 'Gemini AI Itineraries'}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-emerald-500" /> WhatsApp Live Chat
                </span>
                <CheckCircle2 size={15} className="text-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                {isSolo ? 'Single User Chat' : 'Multi-Agent Team Chat'}
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Map size={14} className="text-emerald-500" /> Itinerary & Quotes
                </span>
                <CheckCircle2 size={15} className="text-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                Day-Wise PDF Generator
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <FileText size={14} className="text-emerald-500" /> GST Tax Invoices
                </span>
                <CheckCircle2 size={15} className="text-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                Custom Agency Letterhead
              </p>
            </div>
          </div>

          <div className="sm:hidden pt-2">
            <button
              type="button"
              onClick={() => setUpgradeModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#F97316] text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Upgrade / Manage Plan <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Security Form */}
      <form onSubmit={handlePasswordChange} className="card p-0 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200/50 text-slate-600 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Security & Password</h3>
            <p className="text-xs text-slate-500">Ensure your account uses a strong, secure password.</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <FormRow>
            <Input
              label="Current Password"
              icon={Lock}
              type="password"
              required
              placeholder="Enter current password"
              hint="Verify identity before updating"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
            />
            <Input
              label="New Password"
              icon={Key}
              type="password"
              required
              minLength={6}
              placeholder="Min 6 characters"
              hint="Letters and numbers recommended"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
            />
          </FormRow>

          <div className="flex justify-end pt-4 border-t border-slate-100 mt-2">
            <Button type="submit" disabled={pwSaving} className="px-6 btn-secondary">
              {pwSaving ? 'Updating Password…' : 'Update Password'}
            </Button>
          </div>
        </div>
      </form>

      {/* Upgrade Subscription Plans Modal */}
      {upgradeModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setUpgradeModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center">
                  <Crown size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                    Upgrade Your Agency Plan
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Select the plan that fits your booking volume and team size.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUpgradeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body - 3 Plan Cards */}
            <div className="p-5 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-stretch">
              
              {/* Plan 1: Solo Agent */}
              <div className={`p-5 rounded-2xl border flex flex-col justify-between transition ${
                isSolo ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20' : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40'
              }`}>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Solo Agent</h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">For independent travel consultants.</p>
                  </div>
                  <div className="flex items-baseline text-slate-900 dark:text-zinc-100">
                    <span className="text-2xl font-black">₹999</span>
                    <span className="ml-1 text-xs text-slate-500">/month</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-zinc-300">
                    <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> 1 Dedicated Agent Login</li>
                    <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Up to 200 Client Leads</li>
                    <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> PDF Itinerary Builder</li>
                    <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> GST Tax Invoices</li>
                    <li className="flex gap-2 items-center text-slate-400"><X className="w-3.5 h-3.5 shrink-0" /> No AI Tools</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toast.success('Solo Plan Selected. Opening setup support...');
                    window.open('https://wa.me/919999999999?text=Hi%2C%20I%20want%20to%20subscribe%20to%20EzzySync%20Solo%20Agent%20Plan%20(%E2%82%B9999%2Fmo)', '_blank');
                  }}
                  className={`mt-6 w-full py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isSolo ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200'
                  }`}
                >
                  {isSolo ? 'Current Active Plan' : 'Select Solo (₹999/mo)'}
                </button>
              </div>

              {/* Plan 2: Agency Growth (Most Popular) */}
              <div className="p-5 rounded-2xl border-2 border-[#F97316] bg-white dark:bg-zinc-900/80 shadow-lg shadow-orange-500/5 flex flex-col justify-between relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F97316] text-white text-[9px] uppercase tracking-widest font-black py-0.5 px-3 rounded-full shadow-xs">
                  Most Popular
                </span>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Agency Growth</h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">For growing travel agencies & operators.</p>
                  </div>
                  <div className="flex items-baseline text-slate-900 dark:text-zinc-100">
                    <span className="text-2xl font-black">₹2,499</span>
                    <span className="ml-1 text-xs text-slate-500">/month</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-zinc-200 font-medium">
                    <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Up to 5 Team Logins</li>
                    <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Unlimited Bookings & Leads</li>
                    <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> 1-Click WhatsApp Business API</li>
                    <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Multi-Agent Live Chat</li>
                    <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> AI Itinerary Generator ⚡</li>
                    <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Supplier Costing & Group Tours</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toast.success('Agency Growth Plan Selected. Opening activation support...');
                    window.open('https://wa.me/919999999999?text=Hi%2C%20I%20want%20to%20subscribe%20to%20EzzySync%20Agency%20Growth%20Plan%20(%E2%82%B92499%2Fmo)', '_blank');
                  }}
                  className="mt-6 w-full py-2.5 rounded-xl text-xs font-semibold bg-[#F97316] hover:bg-[#EA580C] text-white shadow-md transition cursor-pointer"
                >
                  {isPaidPro ? 'Current Active Plan' : isTrial ? 'Renew Pro (₹2,499/mo)' : 'Upgrade to Pro'}
                </button>
              </div>

              {/* Plan 3: Enterprise */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Enterprise & DMCs</h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">For corporate travel & DMCs.</p>
                  </div>
                  <div className="flex items-baseline text-slate-900 dark:text-zinc-100">
                    <span className="text-2xl font-black">Custom</span>
                    <span className="ml-1 text-xs text-slate-500">/yearly</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-zinc-300">
                    <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Unlimited Agent Logins</li>
                    <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Multi-Branch Management</li>
                    <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Custom WhatsApp Flows</li>
                    <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Dedicated Account Manager</li>
                    <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> 24/7 Priority Support</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    window.open('https://wa.me/919999999999?text=Hi%2C%20I%20want%20to%20discuss%20EzzySync%20Enterprise%20Plan', '_blank');
                  }}
                  className="mt-6 w-full py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 transition cursor-pointer"
                >
                  Contact Sales Team
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

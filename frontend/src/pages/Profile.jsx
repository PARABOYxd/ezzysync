import React, { useEffect, useState } from 'react';
import * as profileService from '../services/profileService';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import Input from '../components/ui/Input.jsx';
import FormRow from '../components/ui/FormRow.jsx';
import Button from '../components/ui/Button.jsx';
import { User, Mail, Building2, Lock, ShieldCheck, Key } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const toast = useToast();

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
    </div>
  );
}

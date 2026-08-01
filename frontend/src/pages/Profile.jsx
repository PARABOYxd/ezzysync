import React, { useEffect, useState } from 'react';
import * as profileService from '../services/profileService';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import Input from '../components/ui/Input.jsx';
import FormRow from '../components/ui/FormRow.jsx';
import Button from '../components/ui/Button.jsx';

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

  if (!profile) return <div className="skeleton h-64 rounded-2xl" />;

  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={handleSave} className="card space-y-6">
        <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Your Profile</h3>

        <FormRow>
          <Input
            label="User Name"
            required
            placeholder="e.g. Rishab Jain"
            hint="Your display name across the dashboard"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
          <Input
            label="Email Address (read-only)"
            placeholder="Login email"
            value={profile.email}
            disabled
            hint="Primary login email — cannot be changed"
          />
        </FormRow>

        <Input
          label="Company Name"
          placeholder="e.g. TravelGo Holidays Pvt Ltd"
          hint="Your organisation or agency name"
          value={profile.companyName}
          disabled={!isAdmin}
          onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
        />

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving} className="w-full sm:w-auto px-6">
            {saving ? 'Saving…' : 'Update Profile'}
          </Button>
        </div>
      </form>

      <form onSubmit={handlePasswordChange} className="card space-y-6">
        <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Change Password</h3>

        <FormRow>
          <Input
            label="Current Password"
            type="password"
            required
            placeholder="Enter your current password"
            hint="Verify identity before updating"
            value={pwForm.currentPassword}
            onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
          />
          <Input
            label="New Password"
            type="password"
            required
            minLength={6}
            placeholder="Min 6 characters, e.g. Abc@1234"
            hint="Choose a strong password with letters + numbers"
            value={pwForm.newPassword}
            onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
          />
        </FormRow>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={pwSaving} className="w-full sm:w-auto px-6">
            {pwSaving ? 'Updating…' : 'Change Password'}
          </Button>
        </div>
      </form>
    </div>
  );
}

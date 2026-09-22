import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, CheckCircle2 } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import api from '../../services/api.js';

/**
 * What /register shows while self sign-up is switched off
 * (ENABLE_SELF_SIGNUP=false on the backend).
 *
 * Accounts are created by the EzzySync team, so a visitor leaves their
 * details here instead. It posts to the same public endpoint the marketing
 * site's demo form uses, which stores the request in walkthrough_requests
 * for the team to follow up.
 */
export default function RequestAccess() {
  const [form, setForm] = useState({ name: '', agencyName: '', email: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    if (errors[key]) setErrors({ ...errors, [key]: '' });
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Your name is required.';
    if (!form.agencyName.trim()) e.agencyName = 'Agency name is required.';
    if (!form.email.trim()) e.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address.';
    if (form.phone && !/^[0-9+\-\s()]{7,15}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/public/walkthrough', {
        name: form.name.trim(),
        agencyName: form.agencyName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setSent(true);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Could not send your request. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 dark:bg-zinc-950 px-4 py-8">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-7">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-500 text-white flex items-center justify-center mb-3 shadow-lg shadow-brand-500/20">
            <Compass size={24} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 font-display">Request access</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1.5 text-center">
            Accounts are set up by our team. Leave your details and we will send you your login.
          </p>
        </div>

        {sent ? (
          <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xl text-center space-y-3" role="status">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
            <h2 className="text-base font-bold text-slate-800 dark:text-zinc-100">Request received</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Thanks, {form.name.trim()}. We will email your login details to {form.email.trim()}.
            </p>
            <Link to="/login" className="inline-block text-sm text-brand-600 hover:text-brand-700 font-bold hover:underline pt-1">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xl space-y-4" noValidate>
            <Input label="Your name" placeholder="e.g. Rohit Sharma" value={form.name} onChange={set('name')} error={errors.name} required />
            <Input label="Agency name" placeholder="e.g. Sharma Holidays" value={form.agencyName} onChange={set('agencyName')} error={errors.agencyName} required />
            <Input label="Email" type="email" placeholder="yourname@company.com" value={form.email} onChange={set('email')} error={errors.email} required />
            <Input label="Phone" type="tel" placeholder="e.g. 98765 43210" hint="Optional - so we can call you to set things up" value={form.phone} onChange={set('phone')} error={errors.phone} />

            {serverError && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{serverError}</p>}

            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? 'Sending…' : 'Request access'}
            </Button>

            <div className="text-center text-xs text-slate-400 pt-2">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-600 hover:text-brand-700 font-bold hover:underline">Login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, CheckCircle2, Upload, FileText, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import api from '../../services/api.js';

export default function RequestAccess() {
  const [form, setForm] = useState({
    name: '',
    agencyName: '',
    email: '',
    phone: '',
    instagramLink: '',
    websiteLink: '',
    gstNumber: '',
    visitingCardUrl: '',
  });
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    if (errors[key]) setErrors({ ...errors, [key]: '' });
  };

  const handleFileUpload = (e) => {
    setFileError('');
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size must be under 5MB (JPG, PNG or PDF)');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, visitingCardUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setFileName('');
    setFileError('');
    setForm((prev) => ({ ...prev, visitingCardUrl: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Your name is required.';
    if (!form.agencyName.trim()) e.agencyName = 'Agency name is required.';
    if (!form.email.trim()) e.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address.';
    if (!form.phone.trim()) {
      e.phone = 'Phone / WhatsApp number is required.';
    } else if (!/^[0-9+\-\s()]{7,15}$/.test(form.phone.trim())) {
      e.phone = 'Enter a valid 10-digit mobile number.';
    }
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
        instagramLink: form.instagramLink.trim(),
        websiteLink: form.websiteLink.trim(),
        websiteOrInstagram: form.instagramLink.trim() || form.websiteLink.trim(),
        gstNumber: form.gstNumber.trim(),
        visitingCardUrl: form.visitingCardUrl,
      });
      setSent(true);
    } catch (err) {
      let rawMsg = err.response?.data?.message || err.message || '';
      if (typeof rawMsg === 'string') {
        if (rawMsg.includes('Ref:')) rawMsg = rawMsg.split('Ref:')[0].trim();
        if (rawMsg.toLowerCase().includes('not defined') || rawMsg.toLowerCase().includes('syntaxerror') || rawMsg.toLowerCase().includes('internal server')) {
          rawMsg = 'Unable to complete your request right now. Please verify your details or try again in a moment.';
        }
      }
      setServerError(rawMsg || 'Unable to complete your request right now. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 dark:bg-zinc-950 px-4 py-8">
      <div className="w-full max-w-[480px]">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-500 text-white flex items-center justify-center mb-3 shadow-lg shadow-brand-500/20">
            <Compass size={24} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 font-display">
            Request Agency Access
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 text-center">
            EzzySync CRM for Travel Agencies & Tour Operators
          </p>
        </div>

        {sent ? (
          <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xl text-center space-y-3" role="status">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Access Request Received!</h2>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Thanks, <strong>{form.name.trim()}</strong>! Our onboarding team will verify your agency details and send your CRM login credentials to <strong>{form.email.trim()}</strong> and WhatsApp.
            </p>
            <Link to="/login" className="inline-block text-xs text-brand-600 hover:text-brand-700 font-bold hover:underline pt-2">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xl space-y-3.5" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Your Name" placeholder="e.g. Rohit Sharma" value={form.name} onChange={set('name')} error={errors.name} required />
              <Input label="Agency / Company Name" placeholder="e.g. Sharma Holidays" value={form.agencyName} onChange={set('agencyName')} error={errors.agencyName} required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Work Email" type="email" placeholder="yourname@agency.com" value={form.email} onChange={set('email')} error={errors.email} required />
              <Input label="Phone / WhatsApp Number" type="tel" placeholder="e.g. 9876543210" value={form.phone} onChange={set('phone')} error={errors.phone} required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Instagram Profile Link" placeholder="instagram.com/myagency" value={form.instagramLink} onChange={set('instagramLink')} />
              <Input label="Website Link" placeholder="https://myagency.com" value={form.websiteLink} onChange={set('websiteLink')} />
            </div>

            <div>
              <Input label="GST Number (Optional)" placeholder="e.g. 07AAAAA0000A1Z5" value={form.gstNumber} onChange={set('gstNumber')} />
            </div>

            {/* Visiting Card Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Visiting Card / Business Proof (Photo or PDF)
              </label>
              {fileName ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 text-xs">
                  <div className="flex items-center gap-2 text-brand-900 dark:text-brand-300 truncate">
                    <FileText size={15} className="shrink-0" />
                    <span className="truncate">{fileName}</span>
                  </div>
                  <button type="button" onClick={removeFile} className="text-slate-400 hover:text-slate-600 p-1">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-slate-300 dark:border-zinc-700 hover:border-brand-500 rounded-xl cursor-pointer bg-slate-50/50 dark:bg-zinc-950 text-xs text-slate-500 dark:text-zinc-400 transition">
                  <Upload size={14} />
                  <span>Upload Visiting Card / Business ID (Optional)</span>
                  <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
              {fileError && (
                <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1 font-medium">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{fileError}</span>
                </p>
              )}
            </div>

            {serverError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 shadow-xs animate-in fade-in" role="alert">
                <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold block">Submission Notice</span>
                  <span>{serverError}</span>
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? 'Sending Request…' : 'Request Access'}
            </Button>

            <div className="text-center text-xs text-slate-400 pt-1">
              Already an onboarded partner?{' '}
              <Link to="/login" className="text-brand-600 hover:text-brand-700 font-bold hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

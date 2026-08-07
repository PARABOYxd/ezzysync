import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Mail, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import Input from '../components/ui/Input.jsx';
import Textarea from '../components/ui/Textarea.jsx';
import Button from '../components/ui/Button.jsx';
import { API_BASE_URL } from '../services/api.js';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', companyName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Step 2: OTP verification
  const [regToken, setRegToken] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resending, setResending] = useState(false);

  // Step 3: Optional details (phone, address)
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Your name is required.';
    if (!form.companyName.trim()) e.companyName = 'Company name is required.';
    if (!form.email) {
      e.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Enter a valid email address.';
    }
    if (!form.password) {
      e.password = 'Password is required.';
    } else if (form.password.length < 6) {
      e.password = 'Password must be at least 6 characters.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSendOTP = async (ev) => {
    ev.preventDefault();
    if (!validateStep1()) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/auth/register/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Failed to send OTP.');
      setRegToken(data.regToken);
      setStep(2);
      toast.success('Verification code sent! Check your email inbox.');
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setOtpError('');
    try {
      const resp = await fetch(`${API_BASE_URL}/auth/register/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Failed to resend.');
      setRegToken(data.regToken);
      toast.success('New OTP sent!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOTP = async (ev) => {
    ev.preventDefault();
    if (!otp || otp.length !== 6) {
      setOtpError('Please enter the 6-digit code sent to your email.');
      return;
    }
    setOtpError('');
    setLoading(true);
    try {
      const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const resp = await fetch(`${VITE_API_URL}/auth/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp, regToken }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Invalid verification code.');
      setStep(3);
    } catch (err) {
      setOtpError(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async (ev) => {
    ev.preventDefault();
    setLoading(true);
    try {
      await register({ ...form, otp, regToken });
      toast.success('Account created! Welcome to EzzySync. 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <React.Fragment key={s}>
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              step > s
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-300'
                : step === s
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30'
                  : 'bg-slate-200 text-slate-500'
            }`}
          >
            {step > s ? '✓' : s}
          </div>
          {s < 3 && (
            <div className={`h-0.5 w-8 rounded transition-all duration-300 ${step > s ? 'bg-emerald-400' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-brand-300/10 filter blur-[90px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] rounded-full bg-amber-200/15 filter blur-[80px] -z-10" />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-500 text-white flex items-center justify-center mb-3 shadow-lg shadow-brand-500/20">
            <Compass size={24} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display text-center">Create agency account</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 text-center">
            {step === 1 && 'Step 1 of 3 · Enter your details'}
            {step === 2 && 'Step 2 of 3 · Verify your email'}
            {step === 3 && 'Step 3 of 3 · Almost done!'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xl">
          <StepIndicator />

          {/* STEP 1: Account Details */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4" noValidate>
              <Input
                label="Your Name"
                placeholder="e.g. Rishab Jain"
                hint="Your full name as agency owner"
                value={form.name}
                error={errors.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                required
              />
              <Input
                label="Company Name"
                placeholder="e.g. TravelGo Holidays Pvt Ltd"
                hint="Your travel agency or business name"
                value={form.companyName}
                error={errors.companyName}
                onChange={(e) => {
                  setForm({ ...form, companyName: e.target.value });
                  if (errors.companyName) setErrors({ ...errors, companyName: '' });
                }}
                required
              />
              <Input
                label="Organization Email"
                type="email"
                placeholder="e.g. rishab@company.com"
                hint="A 6-digit verification code will be sent here"
                value={form.email}
                error={errors.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                required
              />
              <Input
                label="Password"
                type="password"
                placeholder="Min 6 characters, e.g. Abc@1234"
                hint="Choose a strong and secure password"
                value={form.password}
                error={errors.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                required
              />

              <Button type="submit" disabled={loading} className="w-full mt-2 gap-2">
                {loading ? 'Sending code...' : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </Button>

              <div className="relative my-4 flex items-center justify-center">
                <div className="border-t border-slate-100 w-full" />
                <span className="absolute bg-white px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">or</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  window.location.href = `${API_BASE_URL}/auth/google`;
                }}
                className="w-full flex items-center justify-center gap-2.5 h-11 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-all active:scale-[0.98] text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.89 3.02c.97-2.91 3.67-5.54 6.72-5.54z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.62z" />
                  <path fill="#FBBC05" d="M5.28 14.78a7.07 7.07 0 0 1 0-4.15L1.39 7.61a11.94 11.94 0 0 0 0 8.78l3.89-3.02c-.13-.42-.21-.86-.21-1.3l.21-1.31z" />
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.89c-1.1.74-2.51 1.18-4.23 1.18-3.05 0-5.75-2.63-6.72-5.54L1.39 15.86C3.37 19.75 7.35 23 12 23z" />
                </svg>
                Sign up with Google
              </button>

              <div className="text-center text-xs text-slate-400 pt-2">
                Already have an account?{' '}
                <Link to="/login" className="text-brand-600 hover:text-brand-700 font-bold hover:underline">
                  Login
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-5" noValidate>
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-3">
                  <Mail size={24} className="text-brand-600" />
                </div>
                <p className="text-sm text-slate-700 font-semibold">Check your email inbox</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  We sent a 6-digit verification code to<br />
                  <strong className="text-slate-800">{form.email}</strong>
                </p>
              </div>

              <Input
                label="Verification Code"
                required
                type="text"
                inputMode="numeric"
                maxLength={6}
                inputClassName="text-center text-2xl tracking-[0.5em] font-bold"
                placeholder="· · · · · ·"
                value={otp}
                error={otpError}
                hint="6-digit code sent to your email. Valid for 15 minutes."
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setOtpError('');
                }}
              />

              <Button type="submit" disabled={loading} className="w-full gap-2">
                <CheckCircle2 size={16} />
                <span>{loading ? 'Verifying...' : 'Verify & Continue'}</span>
              </Button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition"
                >
                  ← Change email
                </button>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resending || loading}
                  className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 transition disabled:opacity-50"
                >
                  <RotateCcw size={12} />
                  <span>{resending ? 'Sending...' : 'Resend code'}</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Optional Details + Final Submit */}
          {step === 3 && (
            <form onSubmit={handleFinalSubmit} className="space-y-5" noValidate>
              <div className="text-center space-y-1 mb-2">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28} className="text-emerald-500" />
                </div>
                <p className="text-sm font-bold text-slate-800">Email Verified! ✅</p>
                <p className="text-xs text-slate-500">Optionally add your agency contact details</p>
              </div>

              <Input
                label="Phone Number (optional)"
                type="tel"
                placeholder="e.g. +919876543210"
                hint="For WhatsApp notifications & booking alerts"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <Textarea
                label="Office Address (optional)"
                rows={2}
                placeholder="e.g. 42, MG Road, Indore - 452001, MP"
                hint="Appears on invoices & booking confirmations"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-gradient-to-r from-brand-600 to-teal-600 hover:opacity-90 text-white font-bold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm"
              >
                {loading ? 'Creating your account...' : '🚀 Create My Agency Account'}
              </button>

              <div className="text-center text-xs text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-brand-600 hover:text-brand-700 font-bold hover:underline">
                  Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

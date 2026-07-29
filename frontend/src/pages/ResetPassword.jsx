import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mountain, Mail, KeyRound, Lock } from 'lucide-react';
import * as authService from '../services/authService';
import { useToast } from '../hooks/useToast.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';

export default function ResetPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: location.state?.email || '', otp: '', newPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setLoading(true);
    try {
      await authService.resetPassword(form);
      toast.success('Password reset. Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center mb-3">
            <Mountain size={24} />
          </div>
          <h1 className="text-xl font-semibold text-slate-800">Reset Password</h1>
          <p className="text-sm text-slate-400 mt-1">Enter the OTP sent to your email</p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <Input
            label="Email"
            icon={Mail}
            type="email"
            required
            hint="Your registered email address"
            placeholder="e.g. yourname@company.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="OTP"
            icon={KeyRound}
            required
            maxLength={6}
            inputClassName="tracking-widest"
            hint="6-digit code sent to your email"
            placeholder="e.g. 123456"
            value={form.otp}
            onChange={(e) => setForm({ ...form, otp: e.target.value })}
          />
          <Input
            label="New Password"
            icon={Lock}
            type="password"
            required
            minLength={6}
            hint="Choose a new secure password"
            placeholder="Min 6 characters, e.g. Abc@1234"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Resetting…' : 'Reset Password'}
          </Button>
          <div className="text-center text-sm pt-1">
            <Link to="/login" className="text-brand-600 hover:underline">Back to login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

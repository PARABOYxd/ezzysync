import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mountain, Mail } from 'lucide-react';
import * as authService from '../services/authService';
import { useToast } from '../hooks/useToast.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';

export default function ForgotPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      toast.success('If that email exists, an OTP has been sent.');
      navigate('/reset-password', { state: { email } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
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
          <h1 className="text-xl font-semibold text-slate-800">Forgot Password</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">We'll email you a one-time code to reset it</p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <Input
            label="Email"
            icon={Mail}
            type="email"
            required
            hint="An OTP will be sent to this address"
            placeholder="e.g. yourname@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending…' : 'Send OTP'}
          </Button>
          <div className="text-center text-sm pt-1">
            <Link to="/login" className="text-brand-600 hover:underline">Back to login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

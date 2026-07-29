import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email) {
      e.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Enter a valid email address.';
    }
    if (!form.password) {
      e.password = 'Password is required.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 relative overflow-hidden">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-brand-300/10 filter blur-[90px] -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] rounded-full bg-amber-200/15 filter blur-[80px] -z-10"></div>

      <div className="w-full max-w-[390px] relative z-10">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-500 text-white flex items-center justify-center mb-3 shadow-lg shadow-brand-500/20">
            <Compass size={24} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display">EzzySync</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 text-center">Sign in to manage your travel bookings</p>
        </div>

        {/* Card Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xl space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            placeholder="e.g. yourname@company.com"
            hint="Your registered email address"
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
            placeholder="Enter your password"
            hint="Minimum 6 characters"
            value={form.password}
            error={errors.password}
            onChange={(e) => {
              setForm({ ...form, password: e.target.value });
              if (errors.password) setErrors({ ...errors, password: '' });
            }}
            required
          />

          <div className="flex justify-end text-xs pt-0.5">
            <Link to="/forgot-password" className="text-brand-600 hover:text-brand-700 font-semibold hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? 'Signing in…' : 'Login'}
          </Button>

          <div className="relative my-4 flex items-center justify-center">
            <div className="border-t border-slate-100 w-full"></div>
            <span className="absolute bg-white px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">or</span>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/auth/google`;
            }}
            className="w-full flex items-center justify-center gap-2.5 h-11 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-all active:scale-[0.98] text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.89 3.02c.97-2.91 3.67-5.54 6.72-5.54z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.62z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.78a7.07 7.07 0 0 1 0-4.15L1.39 7.61a11.94 11.94 0 0 0 0 8.78l3.89-3.02c-.13-.42-.21-.86-.21-1.3l.21-1.31z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.89c-1.1.74-2.51 1.18-4.23 1.18-3.05 0-5.75-2.63-6.72-5.54L1.39 15.86C3.37 19.75 7.35 23 12 23z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="text-center text-xs text-slate-400 pt-2">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 hover:text-brand-700 font-bold hover:underline">
              Create account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

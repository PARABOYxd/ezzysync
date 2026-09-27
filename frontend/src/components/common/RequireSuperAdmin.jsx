import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RequireSuperAdmin({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!user.isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-zinc-100">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-950/60 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-800/60">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-black text-white mb-2">
            Access Denied
          </h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            You do not have Super Admin privileges to view this portal. Only authorized EzzySync platform owners are permitted.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-md"
          >
            <ArrowLeft size={14} />
            Go to Agency CRM Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return children;
}

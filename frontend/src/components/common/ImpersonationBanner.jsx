import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function ImpersonationBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const impersonatorData = localStorage.getItem('hf_impersonator');

  if (!impersonatorData) return null;

  let parsed = null;
  try {
    parsed = JSON.parse(impersonatorData);
  } catch (e) {
    return null;
  }

  const handleExit = () => {
    if (!parsed) return;
    localStorage.setItem('hf_token', parsed.token);
    localStorage.setItem('hf_refresh_token', parsed.refreshToken);
    localStorage.setItem('hf_user', JSON.stringify(parsed.user));
    localStorage.removeItem('hf_impersonator');
    window.location.href = '/super-admin';
  };

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-md z-[9999] relative">
      <div className="flex items-center gap-2">
        <Eye size={16} className="animate-pulse shrink-0" />
        <span>
          <strong>Impersonation Mode Active:</strong> You are currently viewing EzzySync as{' '}
          <strong className="underline underline-offset-2">{user?.companyName || user?.name || 'this agency'}</strong> ({user?.email}).
        </span>
      </div>
      <button
        type="button"
        onClick={handleExit}
        className="flex items-center gap-1.5 px-3 py-1 bg-white text-amber-900 rounded-lg font-bold hover:bg-amber-50 transition shadow-sm"
      >
        <LogOut size={13} />
        Exit & Return to Super Admin
      </button>
    </div>
  );
}

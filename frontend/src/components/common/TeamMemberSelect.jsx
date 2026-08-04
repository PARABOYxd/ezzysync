import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { getUsers } from '../../services/userService';
import { useAuth } from '../../hooks/useAuth.jsx';

/**
 * Reusable team member dropdown — only renders for ADMIN users.
 * Props:
 *   value      : string  — currently selected member name ('' = All)
 *   onChange   : fn(name: string) — called with '' for "All"
 *   className  : optional extra classes
 */
export default function TeamMemberSelect({ value, onChange, className = '' }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);

  // Only admins see this
  const isAdmin = user?.role !== 'TEAM_MEMBER';

  useEffect(() => {
    if (!isAdmin) return;
    getUsers()
      .then((users) => setMembers(users.filter((u) => u.name)))
      .catch(() => {});
  }, [isAdmin]);

  if (!isAdmin || members.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      <Users
        size={13}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="pl-7 pr-6 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 appearance-none cursor-pointer focus:outline-none focus:border-brand-500 transition-colors w-full sm:w-auto min-w-[148px]"
      >
        <option value="">All Members</option>
        {members.map((m) => (
          <option key={m.userId || m.name} value={m.name}>
            {m.name}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
        width="10" height="10" viewBox="0 0 10 10" fill="none"
      >
        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

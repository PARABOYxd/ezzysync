import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { getUsers } from '../../services/userService';
import { useAuth } from '../../hooks/useAuth.jsx';
import Select from '../ui/Select.jsx';

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

  const options = [
    { value: '', label: 'All Members' },
    ...members.map((m) => ({
      value: m.name,
      label: m.name,
      hint: m.email || m.role || '',
    })),
  ];

  return (
    <div className={`relative ${className}`}>
      <Select
        icon={Users}
        value={value || ''}
        onChange={(e, val) => onChange(val !== undefined ? val : e?.target?.value || '')}
        options={options}
        className="w-full"
        inputClassName="h-8 min-h-[32px] text-xs py-0 bg-white dark:bg-zinc-800"
      />
    </div>
  );
}

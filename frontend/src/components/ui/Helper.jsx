import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function Helper({ children, error }) {
  if (!children) return null;
  return (
    <div className={error ? 'text-xs text-red-600 flex items-center gap-1 mt-1 font-medium select-none' : 'text-[11px] text-slate-400 dark:text-zinc-500 mt-1 select-none'}>
      {error && <AlertCircle size={12} className="shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

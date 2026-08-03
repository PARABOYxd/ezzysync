import React from 'react';

export default function StatCard({ label, value, icon: Icon, tint = 'brand' }) {
  const tints = {
    brand: 'bg-brand-50 text-brand-600',
    blue: 'bg-brand-50 text-brand-600',
    emerald: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tints[tint].replace('bg-','dark:bg-').replace('-50','-950/30').replace('-100','-900/30').replace('text-','dark:text-').replace('-600','-400')} ${tints[tint]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 dark:text-slate-400 leading-tight">{label}</p>
        <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
}

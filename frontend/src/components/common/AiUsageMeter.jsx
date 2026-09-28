import React from 'react';
import { Sparkles } from 'lucide-react';

const resetLabel = (iso) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';

/**
 * This month's AI allowance: used, left, when it resets.
 *
 * `compact` is the one-line hint shown beside AI buttons ("1 AI action · 377
 * left"), so an agent sees what a click costs before making it. The full
 * version is the plan page's meter.
 */
export default function AiUsageMeter({ limits, usage, compact = false, className = '' }) {
  if (!limits || !usage) return null;
  const limit = Number(limits.aiActionsPerMonth ?? 0);
  const used = Number(usage.aiActions ?? 0);
  if (!limits.canUseAi || limit === 0) {
    return compact ? <span className={`text-[10px] text-slate-400 ${className}`}>AI not in your plan</span> : null;
  }
  const unlimited = limit < 0;
  const left = unlimited ? Infinity : Math.max(0, limit - used);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const tone = left === 0 ? 'rose' : pct >= 80 ? 'amber' : 'emerald';
  const bar = { rose: 'bg-rose-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500' }[tone];
  const text = { rose: 'text-rose-600', amber: 'text-amber-600', emerald: 'text-slate-500' }[tone];

  if (compact) {
    return (
      <span className={`text-[10px] font-medium ${text} ${className}`} title={`${used} of ${unlimited ? 'unlimited' : limit} AI actions used this month`}>
        {left === 0 ? `No AI actions left · resets ${resetLabel(usage.aiActionsResetOn)}` : `1 AI action · ${unlimited ? 'unlimited' : `${left} left`}`}
      </span>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
          <Sparkles size={14} className="text-amber-500" /> AI actions this month
        </span>
        <span className="font-bold text-slate-800 dark:text-zinc-100">
          {used.toLocaleString('en-IN')} / {unlimited ? '∞' : limit.toLocaleString('en-IN')}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit} aria-label="AI actions used this month">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      <p className={`text-[11px] font-medium ${text}`}>
        {left === 0
          ? `All used - AI pauses until ${resetLabel(usage.aiActionsResetOn)}.`
          : `${unlimited ? 'Unlimited' : `${left.toLocaleString('en-IN')} left`} · resets ${resetLabel(usage.aiActionsResetOn)}`}
      </p>
    </div>
  );
}

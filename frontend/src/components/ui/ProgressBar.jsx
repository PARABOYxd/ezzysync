import React from 'react';

const TONES = {
  brand: 'bg-[var(--primary)]',
  warning: 'bg-[var(--warning)]',
  success: 'bg-[var(--success)]',
};

/**
 * Rounded, animated progress bar with an optional inline % label.
 * `tone` picks the fill color; pass `auto` (default) to escalate
 * brand -> warning -> success as `value` approaches `max`, so color is
 * always paired with the numeric label rather than being the only signal.
 */
export default function ProgressBar({ value = 0, max = 100, tone = 'auto', showLabel = false, className = '' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const resolvedTone = tone === 'auto' ? (pct >= 100 ? 'success' : pct >= 75 ? 'warning' : 'brand') : tone;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="flex-1 h-2 rounded-full bg-slate-200/70 dark:bg-zinc-800 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full ${TONES[resolvedTone]} transition-[width] duration-300 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] font-semibold text-[var(--text-secondary)] tabular-nums shrink-0 w-9 text-right">
          {pct}%
        </span>
      )}
    </div>
  );
}

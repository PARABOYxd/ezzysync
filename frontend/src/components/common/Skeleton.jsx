import React from 'react';

export function SkeletonLine({ className = 'h-4 w-full' }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <SkeletonLine className="h-3 w-24" />
      <SkeletonLine className="h-7 w-16" />
    </div>
  );
}

export function SkeletonTableRows({ rows = 5, cols = 7 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-slate-50">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="py-3 px-4">
              <SkeletonLine className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

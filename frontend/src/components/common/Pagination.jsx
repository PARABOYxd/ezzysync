import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  limit = 10,
  itemName = 'records',
  onPageChange,
  className = '',
}) {
  if (totalCount === 0 || totalPages <= 1) return null;

  const start = Math.min((currentPage - 1) * limit + 1, totalCount);
  const end = Math.min(currentPage * limit, totalCount);

  // Helper for smart page numbers window (with ellipsis for large page counts)
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 text-xs text-slate-500 dark:text-zinc-400 ${className}`}
    >
      <div className="text-center sm:text-left">
        Showing <span className="font-semibold text-slate-700 dark:text-zinc-200">{start}</span> to{' '}
        <span className="font-semibold text-slate-700 dark:text-zinc-200">{end}</span> of{' '}
        <span className="font-semibold text-slate-700 dark:text-zinc-200">{totalCount}</span> {itemName}
      </div>

      <div className="flex items-center gap-1 flex-wrap justify-center">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
          title="Previous page"
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400">
                &hellip;
              </span>
            );
          }
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-[32px] h-8 px-2 rounded-lg font-semibold transition ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
          title="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

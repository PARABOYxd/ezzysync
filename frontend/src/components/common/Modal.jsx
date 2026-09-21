import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />
      <div className={`relative bg-white dark:bg-zinc-900 rounded-2xl shadow-card w-full ${widths[size]} max-h-[92dvh] sm:max-h-[90vh] overflow-hidden border border-slate-100 dark:border-zinc-800 flex flex-col`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 rounded-t-2xl z-10 shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-100 truncate pr-2">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto no-scrollbar flex-1 min-h-0">{children}</div>
      </div>
    </div>,
    document.body
  );
}

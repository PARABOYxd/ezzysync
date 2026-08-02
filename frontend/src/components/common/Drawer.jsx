import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Drawer({ open, onClose, title, children }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && open) onClose?.();
    };
    window.addEventListener('keydown', handleEsc);
    
    if (open) {
      document.body.style.overflow = 'hidden';
      // Reset scroll position to top after browser focus events complete
      setTimeout(() => {
        const scrollBody = drawerRef.current?.querySelector('.overflow-y-auto');
        if (scrollBody) {
          scrollBody.scrollTop = 0;
        }
      }, 50);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end items-stretch">
      {/* Scrim: 50% black background */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200" 
        onClick={onClose} 
      />
      
      {/* Drawer Surface: 600px wide right-side slide-over */}
      <div 
        ref={drawerRef}
        className="relative bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 w-full md:w-[600px] h-full flex flex-col shadow-2xl transition-transform duration-200 ease-out transform translate-x-0"
      >
        {/* Header: 64px tall */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-100 dark:border-zinc-800/80 shrink-0">
          <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 active:bg-slate-100 dark:active:bg-zinc-700 text-slate-400 dark:text-zinc-500 transition-colors duration-150 drawer-close-btn"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Scrollable Body: 24px padding */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function SlideOverDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md', // sm: max-w-md, md: max-w-xl, lg: max-w-2xl, xl: max-w-3xl
  actions,
}) {
  const previousActiveElement = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    previousActiveElement.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      // Focus trap
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="slideover-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div
          ref={drawerRef}
          className={`w-screen max-w-full ${sizeClasses[size] || sizeClasses.md} bg-white shadow-2xl flex flex-col animate-slide-in-right border-l border-slate-200/80`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-white sticky top-0 z-10 shrink-0">
            <div className="min-w-0 pr-2 sm:pr-3">
              <h3 id="slideover-title" className="text-sm sm:text-base font-bold text-slate-800 truncate">
                {title}
              </h3>
              {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {actions}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                aria-label="Close drawer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 no-scrollbar overscroll-contain">
            {children}
          </div>

          {/* Optional Sticky Footer */}
          {footer && (
            <div className="px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-50/90 backdrop-blur border-t border-slate-100 sticky bottom-0 z-10 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

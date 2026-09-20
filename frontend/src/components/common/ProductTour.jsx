import React, { useState, useEffect, useCallback } from 'react';
import { Compass, X, ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react';

const TOUR_STEPS = [
  {
    id: 'sidebar',
    target: '#tour-sidebar',
    title: '🚀 Central CRM Navigation',
    description: 'Effortlessly switch between your Leads pipeline, Daily Follow-ups, Bookings, Quotations, and Hotels in one place.',
    preferredPlacement: 'right',
  },
  {
    id: 'search',
    target: '#tour-global-search',
    title: '🔍 Instant Global Search',
    description: 'Press Ctrl + K (or ⌘K) from anywhere to find any customer, phone number, trip, or booking code in milliseconds.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'quick-add',
    target: '#tour-quick-add',
    title: '⚡ Quick Add Lead',
    description: 'Capture fresh enquiries on the go with automatic duplicate phone check, customer pre-fill, and instant assignment.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'theme',
    target: '#tour-theme-toggle',
    title: '🌙 Eye-Friendly Dark Mode',
    description: 'Toggle between comfortable Day and Night modes tailored for intensive 6-8 hour daily travel operations.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'guide',
    target: '#tour-user-guide',
    title: '📖 User Manual & Re-take Tour',
    description: 'Access complete travel agency operating SOPs or restart this guided walkthrough anytime from here.',
    preferredPlacement: 'right',
  },
];

export default function ProductTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [rect, setRect] = useState(null);

  // Auto-launch for first-time login
  useEffect(() => {
    const done = localStorage.getItem('journeyflow_tour_done');
    if (!done) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for manual launch trigger
  useEffect(() => {
    const handleStart = () => {
      setActiveStep(0);
      setIsOpen(true);
    };
    window.addEventListener('start-product-tour', handleStart);
    return () => window.removeEventListener('start-product-tour', handleStart);
  }, []);

  const currentStep = TOUR_STEPS[activeStep];

  const updateRect = useCallback(() => {
    if (!isOpen || !currentStep) return;
    const el = document.querySelector(currentStep.target);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({
        top: Math.max(r.top - 6, 0),
        left: Math.max(r.left - 6, 0),
        width: r.width + 12,
        height: r.height + 12,
        raw: r,
      });
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      // If target element not in DOM (e.g. mobile collapsed sidebar), fallback to center
      setRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [updateRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeStep]);

  const handleClose = () => {
    localStorage.setItem('journeyflow_tour_done', 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (activeStep < TOUR_STEPS.length - 1) {
      setActiveStep((s) => s + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (activeStep > 0) {
      setActiveStep((s) => s - 1);
    }
  };

  if (!isOpen) return null;

  // Calculate tooltip popover position
  const getPopoverStyle = () => {
    if (!rect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const cardWidth = 340;
    const cardHeight = 220;
    const margin = 16;
    const placement = currentStep.preferredPlacement || 'bottom';

    let top = rect.top + rect.height + margin;
    let left = rect.left + rect.width / 2 - cardWidth / 2;

    if (placement === 'right') {
      left = rect.left + rect.width + margin;
      top = rect.top + rect.height / 2 - cardHeight / 2;
    } else if (placement === 'left') {
      left = rect.left - cardWidth - margin;
      top = rect.top + rect.height / 2 - cardHeight / 2;
    } else if (placement === 'top') {
      top = rect.top - cardHeight - margin;
      left = rect.left + rect.width / 2 - cardWidth / 2;
    }

    // Boundary clamping
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    if (left + cardWidth > winW - margin) left = winW - cardWidth - margin;
    if (left < margin) left = margin;
    if (top + cardHeight > winH - margin) top = winH - cardHeight - margin;
    if (top < margin) top = margin;

    return { top: `${top}px`, left: `${left}px` };
  };

  const isLast = activeStep === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto select-none">
      {/* SVG Spotlight Mask */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300">
        <defs>
          <mask id="journeyflow-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.7)"
          mask="url(#journeyflow-spotlight-mask)"
        />
      </svg>

      {/* Animated Pulse Ring around active element */}
      {rect && (
        <div
          style={{
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          }}
          className="absolute rounded-2xl border-2 border-brand-500 shadow-[0_0_0_4px_rgba(249,115,22,0.35)] pointer-events-none transition-all duration-300 animate-pulse"
        />
      )}

      {/* Floating Popover Card */}
      <div
        style={getPopoverStyle()}
        className="absolute z-50 w-[340px] max-w-[calc(100vw-32px)] bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 border border-brand-200/60 dark:border-brand-900/50">
              <Compass size={11} /> Step {activeStep + 1} of {TOUR_STEPS.length}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Close Tour (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100 mb-1.5 flex items-center gap-1.5">
          {currentStep.title}
        </h4>
        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed mb-5">
          {currentStep.description}
        </p>

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80 pt-3.5 mt-2">
          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === activeStep
                    ? 'w-4 bg-brand-600 dark:bg-brand-500'
                    : 'w-1.5 bg-slate-200 dark:bg-zinc-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {activeStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition inline-flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={13} /> Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm inline-flex items-center gap-1 transition cursor-pointer"
            >
              {isLast ? (
                <>
                  <Check size={13} /> Done
                </>
              ) : (
                <>
                  Next <ChevronRight size={13} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Compass, X, ChevronRight, ChevronLeft, Check, Sparkles, 
  MapPin, PhoneCall, FileText, CheckCircle2, MessageSquare, 
  Search, Plus, ArrowRight, BookOpen
} from 'lucide-react';

const TOUR_STEPS = [
  {
    id: 'dashboard',
    route: '/dashboard',
    target: '#tour-sidebar',
    badge: 'Operations Hub',
    title: '📊 Daily Operations & Dashboard',
    description: 'Your central agency command center displaying business performance, key metrics, and daily operational priorities at a glance.',
    dataGuide: 'Key Information Displayed: Monthly sales revenue, pending customer receivables, and departure passenger lists for today and tomorrow.',
    preferredPlacement: 'right',
  },
  {
    id: 'leads',
    route: '/leads',
    target: '#tour-sidebar',
    badge: 'Inquiry Intake',
    title: '🎯 Leads & Inquiry Pipeline',
    description: 'Capture, organize, and assign incoming holiday inquiries received from WhatsApp, Meta ads, website forms, or walk-ins.',
    dataGuide: 'Key Fields to Enter: Traveler Name, Mobile Number, Destination (e.g. Dubai, Bali, Kashmir), Travel Month, Budget, and Pax Count.',
    preferredPlacement: 'right',
  },
  {
    id: 'follow-ups',
    route: '/follow-ups',
    target: '#tour-sidebar',
    badge: 'Client Retention',
    title: '⏰ Daily Follow-up Execution Queue',
    description: 'Never miss a prospective client. Track overdue reminders, calls scheduled for today, and upcoming customer touchpoints.',
    dataGuide: 'Key Details Managed: Scheduled Call Date & Time, Discussion Notes, 1-Click Done, and Quick +1 Day / +3 Days Reschedule buttons.',
    preferredPlacement: 'right',
  },
  {
    id: 'quotations',
    route: '/quotations',
    target: '#tour-sidebar',
    badge: 'Proposals',
    title: '🗺️ Day-Wise Itineraries & Branded Quotes',
    description: 'Build detailed day-by-day travel itineraries with hotel, cab, and sightseeing inclusions, and share branded proposal links via WhatsApp.',
    dataGuide: 'Key Fields to Enter: Day-wise activities, hotel stays, inclusions & exclusions, total package cost, and 1-Click WhatsApp proposal link.',
    preferredPlacement: 'right',
  },
  {
    id: 'bookings',
    route: '/bookings',
    target: '#tour-sidebar',
    badge: 'Operations',
    title: '✈️ Confirmed Bookings & Travel Vouchers',
    description: 'Once a traveler confirms with an advance deposit, manage on-ground tour operations, traveler documents, and vendor coordination.',
    dataGuide: 'Key Details Managed: Confirmed travel dates, passenger passport & ID details, hotel vouchers, supplier costs, and net agency margin.',
    preferredPlacement: 'right',
  },
  {
    id: 'invoices',
    route: '/invoices',
    target: '#tour-sidebar',
    badge: 'Finance',
    title: '🧾 GST Tax Invoices & Payment Tracking',
    description: 'Generate GST-compliant tax invoices, record partial client payments, and track pending outstanding balances with automatic reminders.',
    dataGuide: 'Key Details Managed: Tax Invoice number, payment mode (UPI, NEFT, Card, Cash), GST breakup, and balance payment due dates.',
    preferredPlacement: 'right',
  },
  {
    id: 'chat-ai',
    route: '/whatsapp-chat',
    target: '#tour-sidebar',
    badge: 'Live Automation',
    title: '💬 Live WhatsApp Chat & AI',
    description: 'Chat directly with customers from inside the CRM, send approved template updates, and generate 5-day itineraries in 10 seconds using AI.',
    dataGuide: 'Features Available: In-app WhatsApp client chat, pre-approved message templates, AI Trip Planner, and automated reminders.',
    preferredPlacement: 'right',
  },
  {
    id: 'search-add',
    route: '/dashboard',
    target: '#tour-global-search',
    badge: 'Shortcuts',
    title: '🔍 Global Search (Ctrl+K) & Quick Add',
    description: 'Find any customer name, phone number, or booking reference instantly from anywhere, or log a fresh inquiry without leaving your current screen.',
    dataGuide: 'Quick Shortcuts: Press Ctrl + K (or ⌘K) for Instant Global Search, or click (+ Quick Add) in the top bar.',
    preferredPlacement: 'bottom',
  },
];

export default function ProductTour() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [rect, setRect] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const initialCheckRef = useRef(false);

  // Auto-prompt on first login (Polite Opt-In Welcome Modal)
  useEffect(() => {
    if (initialCheckRef.current) return;
    initialCheckRef.current = true;

    const tourStatus = localStorage.getItem('journeyflow_tour_status');
    const legacyDone = localStorage.getItem('journeyflow_tour_done');

    if (!tourStatus && !legacyDone) {
      const timer = setTimeout(() => {
        setShowWelcome(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for manual launch trigger from Topbar / Sidebar
  useEffect(() => {
    const handleStart = () => {
      setShowWelcome(false);
      setActiveStep(0);
      setIsOpen(true);
      if (location.pathname !== TOUR_STEPS[0].route) {
        navigate(TOUR_STEPS[0].route);
      }
    };
    window.addEventListener('start-product-tour', handleStart);
    return () => window.removeEventListener('start-product-tour', handleStart);
  }, [location.pathname, navigate]);

  const currentStep = TOUR_STEPS[activeStep];

  // Navigate when step changes
  useEffect(() => {
    if (!isOpen || !currentStep) return;
    if (currentStep.route && location.pathname !== currentStep.route) {
      navigate(currentStep.route);
    }
  }, [isOpen, activeStep, currentStep, location.pathname, navigate]);

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
      setRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateRect();
    }, 180);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [updateRect, activeStep]);

  // Keyboard controls
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

  const handleStartTour = () => {
    setShowWelcome(false);
    setActiveStep(0);
    setIsOpen(true);
    if (location.pathname !== TOUR_STEPS[0].route) {
      navigate(TOUR_STEPS[0].route);
    }
  };

  const handleDismissWelcome = () => {
    localStorage.setItem('journeyflow_tour_status', 'dismissed');
    setShowWelcome(false);
  };

  const handleClose = () => {
    localStorage.setItem('journeyflow_tour_status', 'completed');
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

  // Popover card placement calculation
  const getPopoverStyle = () => {
    const cardWidth = 380;
    const cardHeight = 310;
    const margin = 20;

    if (!rect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const placement = currentStep.preferredPlacement || 'right';

    let top = rect.top + rect.height / 2 - cardHeight / 2;
    let left = rect.left + rect.width + margin;

    if (placement === 'bottom') {
      top = rect.top + rect.height + margin;
      left = rect.left + rect.width / 2 - cardWidth / 2;
    } else if (placement === 'left') {
      left = rect.left - cardWidth - margin;
      top = rect.top + rect.height / 2 - cardHeight / 2;
    }

    // Window boundaries clamping
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
    <>
      {/* 1. Polite Opt-In Welcome Modal (Shown once for new users) */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <button
              type="button"
              onClick={handleDismissWelcome}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Skip"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-brand-600 flex items-center justify-center mb-4">
              <Compass size={26} className="animate-spin-slow" />
            </div>

            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Welcome to EzzySync! ✈️
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
              Your complete travel agency operating system designed to streamline inquiries, day-wise itineraries, bookings, and GST billing. Would you like a quick 2-minute interactive walkthrough?
            </p>

            {/* Quick 3 Value Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-700/50 text-left">
                <div className="text-brand-600 font-bold text-xs flex items-center gap-1.5 mb-1">
                  <span>🎯</span> Leads
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                  WhatsApp & web inquiry intake with instant staff assignment
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-700/50 text-left">
                <div className="text-brand-600 font-bold text-xs flex items-center gap-1.5 mb-1">
                  <span>🗺️</span> Quotes
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                  Day-by-day itineraries and 1-click WhatsApp proposal links
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-700/50 text-left">
                <div className="text-brand-600 font-bold text-xs flex items-center gap-1.5 mb-1">
                  <span>✈️</span> Bookings
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                  Vouchers, traveler passenger details, and GST invoices
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleDismissWelcome}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Skip & Explore on my own
              </button>
              <button
                type="button"
                onClick={handleStartTour}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 inline-flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <span>Take 2-Min Tour 🚀</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Interactive Step-by-Step Guided Spotlight Tour */}
      {isOpen && currentStep && (
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
              fill="rgba(15, 23, 42, 0.72)"
              mask="url(#journeyflow-spotlight-mask)"
            />
          </svg>

          {/* Animated Pulse Border Ring around Target element */}
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

          {/* Floating Popover Card with "Data Guide" */}
          <div
            style={getPopoverStyle()}
            className="absolute z-50 w-[380px] max-w-[calc(100vw-32px)] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400 border border-brand-200/70 dark:border-brand-900/50">
                  <Compass size={11} /> Step {activeStep + 1} of {TOUR_STEPS.length}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  {currentStep.badge}
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

            {/* Step Title & Description */}
            <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mb-1.5">
              {currentStep.title}
            </h4>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed mb-3">
              {currentStep.description}
            </p>

            {/* "What Data Goes Here" Practical Guidance Box */}
            <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 rounded-xl p-2.5 mb-4 text-left">
              <div className="text-[10px] font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                <span>📌</span> What Data Goes Here
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-snug">
                {currentStep.dataGuide}
              </p>
            </div>

            {/* Popover Footer Controls */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 pt-3">
              {/* Progress Dots */}
              <div className="flex items-center gap-1">
                {TOUR_STEPS.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveStep(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === activeStep
                        ? 'w-5 bg-brand-600 dark:bg-brand-500'
                        : 'w-1.5 bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300'
                    }`}
                    title={`Go to step ${idx + 1}`}
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
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-xs inline-flex items-center gap-1 transition cursor-pointer"
                >
                  {isLast ? (
                    <>
                      <Check size={13} /> Finish Tour
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
      )}
    </>
  );
}

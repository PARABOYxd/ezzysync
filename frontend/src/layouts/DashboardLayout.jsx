import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import Topbar from '../components/layout/Topbar.jsx';
import NotificationBell from '../components/layout/NotificationBell.jsx';
import InstallAppButton from '../components/layout/InstallAppButton.jsx';
import ThemeToggle from '../components/layout/ThemeToggle.jsx';
import { Plus, Lock, Check, Crown, Sparkles, X } from 'lucide-react';
import LeadFormDrawer from '../components/lead/LeadFormDrawer.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { openRazorpayCheckout } from '../services/paymentService';
import { usePlanCatalog } from '../hooks/usePlanCatalog.js';
import { usePlanStatus } from '../hooks/usePlanStatus.js';

const TITLES = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/follow-ups': 'Follow-ups',
  '/bookings': 'Bookings',
  '/upcoming-trips': 'Upcoming Booked Trip',
  '/whatsapp-chat': 'Live Chat (WhatsApp & Instagram)',
  '/tour-batches': 'Group Tours',
  '/invoices': 'Invoices',
  '/quotations': 'Itineraries & Quotes',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/hotels': 'Hotels & Stays',
  '/guide': 'User Guide',
  '/team': 'Team',
  '/ai-tools': 'AI Travel Tools',
  '/billing': 'Billing & Analytics',
  '/expenses': 'Expenses',
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const toast = useToast();
  // The paywall prints whatever the server charges - see
  // backend/config/planCatalog.js.
  const { plans, loading: catalogLoading, error: catalogError } = usePlanCatalog();

  // Whether access has lapsed is the server's answer, not a sum over the JWT.
  const { isExpired, lapsedPlanId } = usePlanStatus();

  const handlePaywallPayment = (planId, planName) => {
    openRazorpayCheckout({
      planId,
      planName,
      user,
      onSuccess: (res) => {
        toast.success(res.message || 'Payment successful! Plan upgraded.');
        if (res.token && res.user) {
          localStorage.setItem('hf_token', res.token);
          localStorage.setItem('hf_user', JSON.stringify(res.user));
          window.location.reload();
        }
      },
      onError: (err) => {
        toast.error(typeof err === 'string' ? err : 'Payment could not be completed.');
      },
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-page)] text-[var(--text-main)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar 
          title={TITLES[location.pathname] || 'Dashboard'} 
          onMenuClick={() => setSidebarOpen(true)} 
          actions={
            <>
              <button className="btn-primary flex items-center gap-1.5 h-8 px-3 text-xs shrink-0" onClick={() => setAddOpen(true)}>
                <Plus size={14} /> <span className="hidden sm:inline">Quick Add</span>
              </button>
              <ThemeToggle />
              <InstallAppButton />
              <NotificationBell />
            </>
          } 
        />

        {/* Top Grace Notice Banner when Trial/Subscription Expired (Non-blocking) */}
        {isExpired && (
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold shadow-md shrink-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-black/25 text-white font-black text-[10px] uppercase tracking-wider shrink-0">
                {lapsedPlanId ? 'Plan Ended' : 'Trial Ended'}
              </span>
              <span>
                {lapsedPlanId
                  ? 'Your subscription has ended. AI Travel Tools are paused.'
                  : 'Your 30-day free trial has ended. AI Travel Tools & automation are paused.'}
                {' '}You can continue viewing your Dashboard, Bookings, Leads & Invoices.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPaywallOpen(true)}
              className="px-3.5 py-1.5 bg-white text-orange-700 hover:bg-orange-50 font-extrabold rounded-lg transition shadow-xs cursor-pointer shrink-0"
            >
              {lapsedPlanId ? 'Renew Subscription ➔' : 'Upgrade Plan ➔'}
            </button>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 bg-[var(--bg-page)] w-full max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <LeadFormDrawer open={addOpen} onClose={() => setAddOpen(false)} />

      {/* Trial Expired Upgrade Modal (Dismissible, opens on Upgrade button click) */}
      {paywallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh] relative">
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setPaywallOpen(false)}
              className="absolute top-4 right-4 z-20 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Close modal"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="p-6 text-center border-b border-slate-100 dark:border-zinc-800 bg-gradient-to-b from-orange-50/50 to-transparent dark:from-orange-950/20">
              <div className="w-12 h-12 rounded-2xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center mx-auto mb-3">
                <Lock size={26} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                {lapsedPlanId ? 'Your Subscription Has Ended' : 'Upgrade to Unlock 24x7 AI & Growth Features'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                {lapsedPlanId
                  ? 'Renew below to re-enable AI Travel Tools, automated WhatsApp replies, and team collaboration.'
                  : 'Upgrade to keep AI Travel Tools, automated WhatsApp replies, and team growth features active.'}
              </p>
            </div>

            {/* Plans Grid - prices and features come from the server */}
            {catalogError && (
              <div className="p-6 text-center text-sm text-rose-600 dark:text-rose-400">
                {catalogError} Please refresh the page, or contact support to renew.
              </div>
            )}

            {catalogLoading && (
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-52 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 animate-pulse"
                  />
                ))}
              </div>
            )}

            {!catalogLoading && !catalogError && (
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto">
                {plans
                  .filter((plan) => plan.purchasable)
                  .map((plan) => (
                    <div
                      key={plan.id}
                      className={`p-5 rounded-2xl flex flex-col justify-between relative ${
                        plan.highlight
                          ? 'border-2 border-[#F97316] bg-white dark:bg-zinc-900/90 shadow-lg'
                          : 'border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50'
                      }`}
                    >
                      {plan.highlight && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F97316] text-white text-[9px] uppercase tracking-widest font-black py-0.5 px-3 rounded-full shadow-xs">
                          Recommended
                        </span>
                      )}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">{plan.name}</h3>
                          <span className="text-xs font-black text-slate-900 dark:text-zinc-100">
                            {plan.priceLabel} /{plan.period === 'month' ? 'mo' : plan.period}
                          </span>
                        </div>
                        {/* The paywall is a decision screen, not a spec sheet -
                            the first few lines are enough to choose between the
                            two plans, and the full list is on the Profile page. */}
                        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
                          {plan.features
                            .filter((f) => f.included)
                            .slice(0, 3)
                            .map((feature) => (
                              <li key={feature.label} className="flex gap-2 items-center">
                                <Check className="w-3.5 h-3.5 text-emerald-500" /> {feature.label}
                              </li>
                            ))}
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePaywallPayment(plan.id, plan.name)}
                        className={`mt-5 w-full py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          plan.highlight
                            ? 'bg-[#F97316] hover:bg-[#EA580C] text-white shadow-md'
                            : 'border border-slate-300 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200'
                        }`}
                      >
                        {lapsedPlanId === plan.id ? 'Renew' : 'Pay & Activate'} {plan.name} ({plan.priceLabel})
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex items-center justify-between">
              <span className="text-xs text-slate-500">Need help or a custom quote? Contact support.</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPaywallOpen(false)}
                  className="text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:underline cursor-pointer"
                >
                  Continue to Dashboard
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

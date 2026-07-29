"use client";
import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";

export default function Pricing({ crmUrl }) {
  return (
    <section id="pricing" className="py-16 sm:py-24 bg-slate-50 relative z-10">
      
      {/* Hide Scrollbars Style */}
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-16">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 block">Pricing Plans</span>
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Fair Pricing for Travel Agencies
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
            Choose a plan that fits your booking volume. Start for free and upgrade as your team grows.
          </p>
        </div>

        {/* Stack on Mobile, Grid on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pt-6 max-w-6xl mx-auto items-stretch">
          
          {/* Plan 1: Starter */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">Starter Plan</h3>
                <p className="text-slate-500 text-xs mt-1">For independent travel agents starting out.</p>
              </div>
              <div className="flex items-baseline text-slate-900">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">₹0</span>
                <span className="ml-1 text-xs text-slate-500 font-medium">/forever free</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-655">
                <li className="flex gap-2 items-center">
                  <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                  <span>Up to 100 client leads</span>
                </li>
                <li className="flex gap-2 items-center">
                  <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                  <span>Basic Itinerary Builder</span>
                </li>
                <li className="flex gap-2 items-center">
                  <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                  <span>Generate PDF invoices</span>
                </li>
                <li className="flex gap-2 items-center text-slate-400">
                  <span className="text-xs select-none pl-1 pr-1 font-bold">✕</span>
                  <span>No Custom Domain support</span>
                </li>
              </ul>
            </div>
            <a
              href={`${crmUrl}/login`}
              className="mt-8 block w-full text-center py-2.5 sm:py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-all focus-visible:outline-none"
            >
              Get Started Free
            </a>
          </div>

          {/* Plan 2: Growth (Popular) */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-brand-500 shadow-xl flex flex-col justify-between relative md:scale-[1.04] md:z-10 transition-transform duration-200">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-[9px] sm:text-[10px] uppercase tracking-widest font-black py-1 px-4 rounded-full shadow-md shadow-brand-500/35 border border-brand-400/20">
              Most Popular
            </span>
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">Agency Growth</h3>
                <p className="text-slate-500 text-xs mt-1">For growing tour operators and agencies.</p>
              </div>
              <div className="flex items-baseline text-slate-900">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">₹2,499</span>
                <span className="ml-1 text-xs text-slate-500 font-medium">/month</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                <li className="flex gap-2 items-center">
                  <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                  <span className="font-semibold text-slate-900">Unlimited client leads</span>
                </li>
                <li className="flex gap-2 items-center">
                  <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                  <span>Advanced Day-Wise Planner</span>
                </li>
                <li className="flex gap-2 items-center">
                  <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                  <span>Meta WhatsApp API Integration</span>
                </li>
                <li className="flex gap-2 items-center">
                  <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                  <span>Up to 5 agent logins</span>
                </li>
              </ul>
            </div>
            <a
              href={`${crmUrl}/login`}
              className="mt-8 block w-full text-center py-2.5 sm:py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-brand-500/10 hover:shadow-lg transition-all focus-visible:outline-none"
            >
              Start 7-Day Trial
            </a>
          </div>

          {/* Plan 3: Enterprise */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">Enterprise Plan</h3>
                <p className="text-slate-500 text-xs mt-1">For corporate agencies and large tour networks.</p>
              </div>
              <div className="flex items-baseline text-slate-900">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">Custom</span>
                <span className="ml-1 text-xs text-slate-500 font-medium">/yearly billing</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-655">
                <li className="flex gap-2 items-center">
                  <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                  <span>Dedicated server resources</span>
                </li>
                <li className="flex gap-2 items-center">
                  <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                  <span>Unlimited agent accounts</span>
                </li>
                <li className="flex gap-2 items-center">
                  <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                  <span>Custom email & API integrations</span>
                </li>
                <li className="flex gap-2 items-center">
                  <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                  <span>24/7 dedicated support representative</span>
                </li>
              </ul>
            </div>
            <Link
              href="/contact"
              className="mt-8 block w-full text-center py-2.5 sm:py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-all focus-visible:outline-none"
            >
              Contact Sales Team
            </Link>
          </div>

        </div>

      </div>
    </section>
  );
}

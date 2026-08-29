"use client";
import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

export default function Pricing({ crmUrl }) {
  return (
    <section id="pricing" className="py-16 sm:py-32 bg-white relative z-10">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 space-y-12 sm:space-y-16">

        {/* Section Heading */}
        <ScrollReveal className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 block">Pricing & Plans</span>
          <h2 className="font-semibold text-3xl sm:text-4xl tracking-[-0.02em] text-slate-950">
            Predictable Pricing to Scale Your Travel Agency
          </h2>
          <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            From solo travel consultants to high-volume tour operators — pick the plan that automates your bookings, supplier costing, and team workflow.
          </p>

          {/* 30-Day Free Trial Guarantee Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-200 shadow-xs">
              🎁 30-Day Full-Access Free Trial
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium text-xs">
              💳 No Credit Card Required
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium text-xs">
              ⚡ Instant 2-Minute Setup
            </span>
          </div>
        </ScrollReveal>

        {/* Stack on Mobile, Grid on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto items-stretch">

          {/* Plan 1: Solo Agent */}
          <ScrollReveal>
            <div className="h-full bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors duration-200 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-base text-slate-900 tracking-tight">Solo Agent</h3>
                  <p className="text-slate-500 text-xs mt-1">For independent travel consultants & solo planners.</p>
                </div>
                <div className="flex items-baseline text-slate-950">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight">₹999</span>
                  <span className="ml-1.5 text-xs text-slate-500 font-medium">/month</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>1 Dedicated Agent Login</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Up to 200 Client Leads</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Day-Wise PDF Itinerary Builder</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>GST & Tax Invoice Generation</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Client Follow-up Reminders</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>EzzySync Shared WhatsApp Pool</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 space-y-2">
                <a
                  href={`${crmUrl}/login`}
                  className="block w-full text-center py-2.5 sm:py-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 font-medium text-sm transition-colors focus-visible:outline-none"
                >
                  Start 30-Day Free Trial
                </a>
                <p className="text-[11px] text-center text-slate-400">Includes 30 days free trial</p>
              </div>
            </div>
          </ScrollReveal>

          {/* Plan 2: Growth (Popular) */}
          <ScrollReveal delay={80}>
            <div className="h-full bg-white p-6 sm:p-7 rounded-2xl border-2 border-brand-500 shadow-xl flex flex-col justify-between relative md:scale-[1.03] transition-transform duration-200">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-[9px] uppercase tracking-widest font-black py-0.5 px-3.5 rounded-full shadow-md shadow-brand-500/25">
                Most Popular
              </span>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-base text-slate-900 tracking-tight">Agency Growth</h3>
                  <p className="text-slate-500 text-xs mt-1">For growing travel agencies & tour operators.</p>
                </div>
                <div className="flex items-baseline text-slate-950">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight">₹2,499</span>
                  <span className="ml-1.5 text-xs text-slate-500 font-medium">/month (after 30 days)</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span className="font-semibold text-slate-900">Up to 5 Team Agent Logins</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span className="font-semibold text-slate-900">Unlimited Leads & Bookings</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>1-Click WhatsApp Business API Link</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Multi-Agent Live Chat (1 Shared Number)</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Inbound Lead Auto-Capture</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Supplier Costing & Profit Margins</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Group Tours & Rooming/Pax Lists</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>AI Itinerary Generator & Quotes</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Custom Agency Letterhead & Branding</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 space-y-2">
                <a
                  href={`${crmUrl}/login`}
                  className="block w-full text-center py-2.5 sm:py-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/10 hover:shadow-lg transition-all focus-visible:outline-none"
                >
                  Start 30-Day Free Trial
                </a>
                <p className="text-[11px] text-center text-slate-400">Full Access • No card needed</p>
              </div>
            </div>
          </ScrollReveal>

          {/* Plan 3: Enterprise */}
          <ScrollReveal delay={160}>
            <div className="h-full bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors duration-200 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-base text-slate-900 tracking-tight">Enterprise & DMCs</h3>
                  <p className="text-slate-500 text-xs mt-1">For corporate agencies & travel franchises.</p>
                </div>
                <div className="flex items-baseline text-slate-950">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight">Custom</span>
                  <span className="ml-1.5 text-xs text-slate-500 font-medium">/yearly billing</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span className="font-semibold text-slate-900">Unlimited Agent Logins & Roles</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Multi-Branch & Location Management</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Custom WhatsApp Chatbot & Flows</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Dedicated Account Manager</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Free Excel Data Migration Support</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>24/7 Priority WhatsApp & Call Support</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/contact"
                className="mt-8 block w-full text-center py-2.5 sm:py-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 font-medium text-sm transition-colors focus-visible:outline-none"
              >
                Contact Sales Team
              </Link>
            </div>
          </ScrollReveal>

        </div>

      </div>
    </section>
  );
}

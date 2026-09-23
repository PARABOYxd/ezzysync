"use client";

import React from "react";
import Link from "next/link";
import { Check, ShieldCheck, RefreshCcw, Download, CreditCard } from "lucide-react";
import ScrollReveal from "../ScrollReveal";
import { PLAN_PRICE_LABEL } from "@/data/plans";

export default function Pricing({ crmUrl }) {
  const trialUrl = crmUrl ? `${crmUrl}/login` : "/contact";

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-white text-slate-900 scroll-mt-16 relative">
      <div className="max-w-[1140px] mx-auto px-5 sm:px-6 space-y-12 sm:space-y-16">
        
        {/* Section Heading */}
        <ScrollReveal className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
            Predictable Pricing
          </span>

          <h2 className="font-bold text-3xl sm:text-4xl tracking-tight text-slate-950">
            Straightforward Plans for Growing Agencies
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            From independent travel planners to multi-coordinator tour operators — choose the plan that fits your agency workflow.
          </p>
        </ScrollReveal>

        {/* 3 Clean Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          
          {/* Plan 1: Solo Agent */}
          <ScrollReveal>
            <div className="h-full bg-white p-7 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 tracking-tight">Solo Agent</h3>
                  <p className="text-slate-500 text-sm mt-1">For independent travel designers and consultants.</p>
                </div>

                <div className="flex items-baseline text-slate-950">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight">{PLAN_PRICE_LABEL.SOLO}</span>
                  <span className="ml-1.5 text-sm text-slate-500 font-medium">/month</span>
                </div>

                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2 items-start">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>1 Dedicated Agent Login</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>Up to 200 Client Inquiries</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>Day-Wise PDF Itinerary Builder</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>Quotation &amp; Invoice Generation</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>Follow-up Reminders</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>EzzySync Shared WhatsApp Pool</span>
                  </li>
                </ul>
              </div>

              <div>
                <a
                  href={trialUrl}
                  className="block w-full text-center py-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-900 font-semibold text-sm transition-colors"
                >
                  Start Free Trial
                </a>
              </div>
            </div>
          </ScrollReveal>

          {/* Plan 2: Agency Growth (Highlighted) */}
          <ScrollReveal delay={80}>
            <div className="h-full bg-white p-7 sm:p-8 rounded-2xl border-2 border-brand-500 shadow-lg flex flex-col justify-between space-y-6 relative md:-translate-y-2">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[10px] uppercase tracking-wider font-bold py-0.5 px-3 rounded-full shadow-sm">
                Most Popular
              </span>

              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 tracking-tight">Agency Growth</h3>
                  <p className="text-slate-500 text-sm mt-1">For growing travel agencies with sales teams.</p>
                </div>

                <div className="flex items-baseline text-slate-950">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight">{PLAN_PRICE_LABEL.PRO}</span>
                  <span className="ml-1.5 text-sm text-slate-500 font-medium">/month</span>
                </div>

                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex gap-2 items-start font-medium text-slate-900">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>Up to 5 Team Agent Logins</span>
                  </li>
                  <li className="flex gap-2 items-start font-medium text-slate-900">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>Unlimited Leads &amp; Bookings</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>Official Meta WhatsApp Cloud API</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>Multi-Agent Live Chat (1 Shared Number)</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>AI Itinerary Generator + Day-Wise Builder</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>Razorpay Payments Auto-Matched</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>Custom Agency Letterhead &amp; PDF Quotes</span>
                  </li>
                </ul>
              </div>

              <div>
                <a
                  href={trialUrl}
                  className="block w-full text-center py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-all"
                >
                  Start Free Trial
                </a>
              </div>
            </div>
          </ScrollReveal>

          {/* Plan 3: Enterprise & DMCs */}
          <ScrollReveal delay={160}>
            <div className="h-full bg-white p-7 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 tracking-tight">Enterprise &amp; DMCs</h3>
                  <p className="text-slate-500 text-sm mt-1">For high-volume operators and multi-branch agencies.</p>
                </div>

                <div className="flex items-baseline text-slate-950">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight">Custom</span>
                  <span className="ml-2 text-sm text-slate-500 font-medium">billed annually</span>
                </div>

                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2 items-start font-medium text-slate-900">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>Unlimited Agent Logins &amp; Roles</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>Multi-Branch &amp; Location Management</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>Custom WhatsApp Workflow Setup</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>CSV / Excel Migration Assistance</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>Dedicated Onboarding Support</span>
                  </li>
                </ul>
              </div>

              <div>
                <Link
                  href="/contact"
                  className="block w-full text-center py-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-900 font-semibold text-sm transition-colors"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </ScrollReveal>

        </div>

        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" /> No credit card to start
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Payments secured by Razorpay
          </li>
          <li className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4 text-emerald-600" /> Cancel or switch plans anytime
          </li>
          <li className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-600" /> Export your data anytime
          </li>
        </ul>

      </div>
    </section>
  );
}

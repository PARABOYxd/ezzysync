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
        <ScrollReveal className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="font-semibold text-3xl sm:text-4xl tracking-[-0.02em] text-slate-950">
            Fair pricing for travel agencies
          </h2>
          <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-[50ch] mx-auto">
            Choose a plan that fits your booking volume. Start for free and upgrade as your team grows.
          </p>
        </ScrollReveal>

        {/* Stack on Mobile, Grid on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto items-stretch">

          {/* Plan 1: Starter */}
          <ScrollReveal>
            <div className="h-full bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors duration-200 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-base text-slate-900 tracking-tight">Starter</h3>
                  <p className="text-slate-500 text-xs mt-1">For independent travel agents starting out.</p>
                </div>
                <div className="flex items-baseline text-slate-950">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight">₹0</span>
                  <span className="ml-1.5 text-xs text-slate-500 font-medium">/forever free</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Up to 100 client leads</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Basic itinerary builder</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Generate PDF invoices</span>
                  </li>
                  <li className="flex gap-2 items-center text-slate-400">
                    <span className="text-xs select-none pl-1 pr-1 font-bold">✕</span>
                    <span>No custom domain support</span>
                  </li>
                </ul>
              </div>
              <a
                href={`${crmUrl}/login`}
                className="mt-8 block w-full text-center py-2.5 sm:py-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 font-medium text-sm transition-colors focus-visible:outline-none"
              >
                Get started free
              </a>
            </div>
          </ScrollReveal>

          {/* Plan 2: Growth (Popular) */}
          <ScrollReveal delay={80}>
            <div className="h-full bg-white p-6 sm:p-7 rounded-2xl border border-brand-500 flex flex-col justify-between relative">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-base text-slate-900 tracking-tight">Agency Growth</h3>
                  <p className="text-slate-500 text-xs mt-1">For growing tour operators and agencies.</p>
                </div>
                <div className="flex items-baseline text-slate-950">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight">₹2,499</span>
                  <span className="ml-1.5 text-xs text-slate-500 font-medium">/month</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span className="font-medium text-slate-900">Unlimited client leads</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Advanced day-wise planner</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Meta WhatsApp API integration</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" focusable="false" />
                    <span>Up to 5 agent logins</span>
                  </li>
                </ul>
              </div>
              <a
                href={`${crmUrl}/login`}
                className="mt-8 block w-full text-center py-2.5 sm:py-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-colors focus-visible:outline-none"
              >
                Start 7-day trial
              </a>
            </div>
          </ScrollReveal>

          {/* Plan 3: Enterprise */}
          <ScrollReveal delay={160}>
            <div className="h-full bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors duration-200 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-base text-slate-900 tracking-tight">Enterprise</h3>
                  <p className="text-slate-500 text-xs mt-1">For corporate agencies and large tour networks.</p>
                </div>
                <div className="flex items-baseline text-slate-950">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight">Custom</span>
                  <span className="ml-1.5 text-xs text-slate-500 font-medium">/yearly billing</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-600">
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
                className="mt-8 block w-full text-center py-2.5 sm:py-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 font-medium text-sm transition-colors focus-visible:outline-none"
              >
                Contact sales team
              </Link>
            </div>
          </ScrollReveal>

        </div>

      </div>
    </section>
  );
}

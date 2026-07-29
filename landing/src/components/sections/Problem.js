"use client";
import React from "react";
import { XCircle, CheckCircle2 } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

export default function Problem() {
  return (
    <section id="problem" className="py-16 sm:py-32 bg-slate-50">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 space-y-12 sm:space-y-16">

        <ScrollReveal className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="font-semibold text-3xl sm:text-4xl tracking-[-0.02em] text-slate-950">
            Why traditional booking management fails
          </h2>
          <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-[50ch] mx-auto">
            Manage trips without losing leads, forgetting itineraries, or creating messy invoices manually.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 max-w-4xl mx-auto">
          {/* Old Way */}
          <ScrollReveal>
            <div className="h-full bg-white p-6 sm:p-7 rounded-2xl border border-slate-200">
              <h3 className="font-semibold text-lg text-slate-900 mb-4 flex items-center gap-2 tracking-tight">
                <XCircle className="w-5 h-5 text-red-500" aria-hidden="true" focusable="false" />
                <span>The painful old way</span>
              </h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-2.5 items-start">
                  <span className="mt-1 font-bold text-red-500 text-xs" aria-hidden="true">✕</span>
                  <span>Leads lost in scattered WhatsApp chat history.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="mt-1 font-bold text-red-500 text-xs" aria-hidden="true">✕</span>
                  <span>Writing day-wise itineraries repeatedly in Excel.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="mt-1 font-bold text-red-500 text-xs" aria-hidden="true">✕</span>
                  <span>Creating PDF invoices manually with Word templates.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="mt-1 font-bold text-red-500 text-xs" aria-hidden="true">✕</span>
                  <span>No clear trace of client payments or pending dues.</span>
                </li>
              </ul>
            </div>
          </ScrollReveal>

          {/* The EzzySync Way */}
          <ScrollReveal delay={100}>
            <div className="h-full bg-white p-6 sm:p-7 rounded-2xl border border-brand-200">
              <h3 className="font-semibold text-lg text-slate-900 mb-4 flex items-center gap-2 tracking-tight">
                <CheckCircle2 className="w-5 h-5 text-brand-600" aria-hidden="true" focusable="false" />
                <span>The EzzySync way</span>
              </h3>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-2.5 items-start">
                  <span className="mt-1 font-bold text-brand-500 text-sm" aria-hidden="true">✓</span>
                  <span>Centralized pipeline: track lead status from inquiry to travel.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="mt-1 font-bold text-brand-500 text-sm" aria-hidden="true">✓</span>
                  <span>Stunning itinerary templates with hotel and tour cards.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="mt-1 font-bold text-brand-500 text-sm" aria-hidden="true">✓</span>
                  <span>Auto-generated, tenant-isolated PDF invoices in one click.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="mt-1 font-bold text-brand-500 text-sm" aria-hidden="true">✓</span>
                  <span>Instant alerts sent automatically through WhatsApp.</span>
                </li>
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

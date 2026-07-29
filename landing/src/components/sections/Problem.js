"use client";
import React from "react";
import { XCircle, CheckCircle2 } from "lucide-react";

export default function Problem() {
  return (
    <section id="problem" className="py-20 sm:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 block">The Problem</span>
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Why Traditional Booking Management Fails
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
            Manage trips without losing leads, forgetting itineraries, or creating messy invoices manually.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Old Way */}
          <div className="bg-slate-100/75 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-400"></div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" aria-hidden="true" focusable="false" />
              <span>The Painful Old Way</span>
            </h3>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-655">
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

          {/* The JourneyFlow Way */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 border-l-2 border-l-brand-500 shadow-md relative overflow-hidden">
            <h3 className="font-display text-lg sm:text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-brand-600" aria-hidden="true" focusable="false" />
              <span>The JourneyFlow Way</span>
            </h3>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
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
        </div>
      </div>
    </section>
  );
}

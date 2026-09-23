"use client";
import React from "react";
import { XCircle, CheckCircle2, Check, X } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

const beforePoints = [
  "Scattered WhatsApp chats across personal phones",
  "Lost leads in static Excel and Google Sheets",
  "Manual follow-up reminders written on paper",
  "Hours wasted designing Word and Canva quotes",
  "Manually typed day-by-day itineraries",
  "Payment receipts buried in personal chat logs",
  "Zero real-time visibility into sales pipeline",
];

const afterPoints = [
  "Official Meta WhatsApp shared multi-agent inbox",
  "Centralized lead pipeline with stage-wise Kanban",
  "Automated follow-up reminders & task queues",
  "Instant GST-compliant travel quotations (SAC 998555)",
  "AI-powered day-wise itinerary & voucher engine",
  "Automated Razorpay UPI reconciliation & balance ledger",
  "Unified cloud workspace for your entire agency team",
];

export default function Problem() {
  return (
    <section id="problem" className="py-16 sm:py-24 bg-slate-50 border-t border-b border-slate-200">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 space-y-12 sm:space-y-16">

        <ScrollReveal className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
            The Operational Reality
          </span>
          <h2 className="font-extrabold text-3xl sm:text-4xl tracking-[-0.02em] text-slate-950">
            Still Running Your Travel Business Across WhatsApp, Excel and PDFs?
          </h2>
          <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-[55ch] mx-auto">
            When inquiries grow, managing bookings across personal phones and spreadsheets creates missed follow-ups, delayed quotes, and lost revenue.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {/* Before */}
          <ScrollReveal>
            <div className="h-full bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-150">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-5 h-5" aria-hidden="true" focusable="false" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                      Before EzzySync
                    </h3>
                    <p className="text-xs text-slate-400">Disconnected manual operations</p>
                  </div>
                </div>

                <ul className="space-y-3.5 text-sm text-slate-600">
                  {beforePoints.map((item, idx) => (
                    <li key={idx} className="flex gap-2.5 items-start">
                      <div className="w-4 h-4 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                        <X className="w-3 h-3" />
                      </div>
                      <span className="text-slate-600 text-xs sm:text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ScrollReveal>

          {/* After EzzySync */}
          <ScrollReveal delay={100}>
            <div className="h-full bg-gradient-to-b from-white to-orange-50/20 p-6 sm:p-8 rounded-2xl border border-brand-200 shadow-[0_4px_24px_rgba(249,115,22,0.06),0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-brand-500/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-brand-100">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" aria-hidden="true" focusable="false" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                      With EzzySync
                    </h3>
                    <p className="text-xs text-brand-600 font-semibold">One systematic travel workspace</p>
                  </div>
                </div>

                <ul className="space-y-3.5 text-sm text-slate-700">
                  {afterPoints.map((item, idx) => (
                    <li key={idx} className="flex gap-2.5 items-start">
                      <div className="w-4 h-4 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                      <span className="font-medium text-slate-900 text-xs sm:text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ScrollReveal>
        </div>

      </div>
    </section>
  );
}

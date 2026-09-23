"use client";

import React from "react";
import { Check, X, ArrowRight } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

const comparisonFeatures = [
  {
    name: "Day-Wise Travel Itinerary Builder",
    ezzysync: "Built-in day-by-day builder with reusable hotel & tour templates",
    generic: "Not available (Requires third-party tools)",
    manual: "Manual copy-pasting in Word or Canva",
  },
  {
    name: "Official Meta WhatsApp Cloud API",
    ezzysync: "1 Shared agency number with multi-agent live chat",
    generic: "Paid add-on per conversation or expensive third-party bot",
    manual: "Scattered across employees' personal phones",
  },
  {
    name: "Tour Operator SAC 998555 Invoicing",
    ezzysync: "Automatic GST travel invoices & itemized quotes",
    generic: "Generic invoices without tour SAC codes or meal plans",
    manual: "Manual Excel invoices prone to calculation errors",
  },
  {
    name: "Hotel & Driver Service Vouchers",
    ezzysync: "1-Click generation of driver duty slips & hotel vouchers",
    generic: "Not supported",
    manual: "Typed manually each time in Word or Photoshop",
  },
  {
    name: "Multi-Milestone Payment Tracking",
    ezzysync: "Advance, hotel installment & balance tracking + Razorpay sync",
    generic: "Single transaction logging, no milestone schedules",
    manual: "Checking bank screenshots in WhatsApp chats",
  },
  {
    name: "Supplier Costing & Profit Margin Protection",
    ezzysync: "Auto-calculates gross & net profit before sending quote",
    generic: "Requires complex custom spreadsheet formulas",
    manual: "Mental math leading to margin erosion and losses",
  },
  {
    name: "Multi-Agent Data Privacy & Protection",
    ezzysync: "Coordinators only see their leads; client numbers protected",
    generic: "Complex enterprise tier pricing required",
    manual: "Zero security; staff can download entire client list",
  },
];

export default function ComparisonMatrix({ crmUrl }) {
  const trialUrl = crmUrl ? `${crmUrl}/login` : "/pricing";

  return (
    <section className="py-20 sm:py-28 bg-[#fafafa] border-b border-slate-200 scroll-mt-16">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6 space-y-12">
        
        {/* Section Heading */}
        <ScrollReveal className="text-center max-w-3xl mx-auto space-y-3.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
            Why Travel Agencies Choose EzzySync
          </span>

          <h2 className="font-extrabold text-3xl sm:text-4xl lg:text-[2.65rem] tracking-[-0.03em] text-slate-950">
            EzzySync vs Disconnected Tools &amp; Generic CRMs
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Generic sales CRMs were built for software or real estate. See why leading travel businesses switch to a platform engineered specifically for tourism operations.
          </p>
        </ScrollReveal>

        {/* Comparison Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden max-w-5xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="py-4 px-6 w-2/5">Capability</th>
                  <th className="py-4 px-6 w-1/3 bg-brand-50/60 text-brand-700 border-x border-brand-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />
                      <span>EzzySync Travel CRM</span>
                    </div>
                  </th>
                  <th className="py-4 px-6 w-1/4 text-slate-500">Generic CRMs / Excel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {comparisonFeatures.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {row.name}
                    </td>
                    <td className="py-4 px-6 bg-brand-50/30 text-slate-900 font-medium border-x border-brand-100/60">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                        <span>{row.ezzysync}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      <div className="flex items-start gap-2">
                        <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <span>{row.generic}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Callout inside Table */}
          <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-bold text-base text-white">Ready to streamline your travel agency operations?</div>
              <div className="text-xs text-slate-400">Join hundreds of travel planners running on EzzySync.</div>
            </div>
            <a
              href={trialUrl}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 flex-shrink-0"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}

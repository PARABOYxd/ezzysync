import React from "react";
import { comparisonRows } from "../../data/landingData";
import ScrollReveal from "../ScrollReveal";

export default function WhyEzzySync() {
  return (
    <section id="why-ezzysync" aria-labelledby="why-ezzysync-heading" className="py-20 sm:py-28 bg-slate-50 border-b border-slate-200 relative z-10 scroll-mt-20">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 space-y-10 sm:space-y-14">
        <ScrollReveal className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
            Capability Comparison
          </span>
          <h2 id="why-ezzysync-heading" className="font-extrabold text-3xl sm:text-4xl tracking-[-0.02em] text-slate-950">
            Why EzzySync is the Purpose-Built Travel CRM
          </h2>
          <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-[55ch] mx-auto">
            EzzySync is a travel CRM and booking management platform that replaces spreadsheets, scattered
            WhatsApp chats, and generic sales CRMs with one system built specifically for lead management,
            itinerary building, invoicing, and client communication.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={120} as="article" className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[640px]">
            <caption className="sr-only">
              Comparison of EzzySync against spreadsheets and generic CRM software for travel agencies
            </caption>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th scope="col" className="p-4 sm:p-5 font-semibold text-slate-500">Capability</th>
                <th scope="col" className="p-4 sm:p-5 font-semibold text-slate-500">Spreadsheets</th>
                <th scope="col" className="p-4 sm:p-5 font-semibold text-slate-500">Generic CRM</th>
                <th scope="col" className="p-4 sm:p-5 font-semibold text-brand-600">EzzySync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparisonRows.map((row, idx) => (
                <tr key={idx}>
                  <th scope="row" className="p-4 sm:p-5 font-medium text-slate-900 align-top">{row.feature}</th>
                  <td className="p-4 sm:p-5 text-slate-500 align-top">{row.spreadsheet}</td>
                  <td className="p-4 sm:p-5 text-slate-500 align-top">{row.genericCrm}</td>
                  <td className="p-4 sm:p-5 text-slate-900 font-medium align-top">{row.ezzysync}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollReveal>
      </div>
    </section>
  );
}

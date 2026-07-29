import React from "react";
import { comparisonRows } from "../../data/landingData";

export default function WhyEzzySync() {
  return (
    <section id="why-ezzysync" aria-labelledby="why-ezzysync-heading" className="py-16 sm:py-24 bg-slate-50 relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 block">Why EzzySync</span>
          <h2 id="why-ezzysync-heading" className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Why EzzySync Is the Best Travel CRM for Agencies
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
            EzzySync is a travel CRM and booking management platform that replaces spreadsheets, scattered
            WhatsApp chats, and generic sales CRMs with one system built specifically for lead management,
            itinerary building, invoicing, and client communication.
          </p>
        </div>

        <article className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[640px]">
            <caption className="sr-only">
              Comparison of EzzySync against spreadsheets and generic CRM software for travel agencies
            </caption>
            <thead>
              <tr className="bg-slate-900 text-white">
                <th scope="col" className="p-3 sm:p-4 font-semibold">Capability</th>
                <th scope="col" className="p-3 sm:p-4 font-semibold">Spreadsheets</th>
                <th scope="col" className="p-3 sm:p-4 font-semibold">Generic CRM</th>
                <th scope="col" className="p-3 sm:p-4 font-semibold text-brand-300">EzzySync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparisonRows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                  <th scope="row" className="p-3 sm:p-4 font-semibold text-slate-800 align-top">{row.feature}</th>
                  <td className="p-3 sm:p-4 text-slate-500 align-top">{row.spreadsheet}</td>
                  <td className="p-3 sm:p-4 text-slate-500 align-top">{row.genericCrm}</td>
                  <td className="p-3 sm:p-4 text-slate-800 font-medium align-top">{row.ezzysync}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>
    </section>
  );
}

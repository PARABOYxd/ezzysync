import React from "react";
import Link from "next/link";
import { Check, X, Minus } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

// yes = built in, partial = possible with add-ons/workarounds, no = not really
const rows = [
  { name: "Day-wise itinerary builder", ezzysync: "yes", manual: "no", generic: "no" },
  { name: "Shared WhatsApp inbox for the team", ezzysync: "yes", manual: "no", generic: "partial" },
  { name: "GST quotes with tour operator SAC", ezzysync: "yes", manual: "partial", generic: "partial" },
  { name: "Advance & balance tracking per trip", ezzysync: "yes", manual: "partial", generic: "no" },
  { name: "Hotel vouchers & driver duty slips", ezzysync: "yes", manual: "no", generic: "no" },
];

const columns = [
  { key: "ezzysync", label: "EzzySync" },
  { key: "manual", label: "Excel + WhatsApp" },
  { key: "generic", label: "Generic CRM" },
];

const statusLabel = { yes: "Built in", partial: "Partly / with add-ons", no: "Not available" };

function Mark({ value }) {
  if (value === "yes") {
    return (
      <span className="inline-flex w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 items-center justify-center">
        <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
        <span className="sr-only">{statusLabel.yes}</span>
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="inline-flex w-7 h-7 rounded-full bg-amber-50 text-amber-600 items-center justify-center">
        <Minus className="w-4 h-4 stroke-[3]" aria-hidden="true" />
        <span className="sr-only">{statusLabel.partial}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex w-7 h-7 rounded-full bg-rose-50 text-rose-500 items-center justify-center">
      <X className="w-4 h-4 stroke-[3]" aria-hidden="true" />
      <span className="sr-only">{statusLabel.no}</span>
    </span>
  );
}

export default function ComparisonMatrix() {
  return (
    <section id="compare" className="py-20 sm:py-28 bg-[#fafafa] border-b border-slate-200 scroll-mt-16">
      <div className="max-w-[1000px] mx-auto px-5 sm:px-6 space-y-10 sm:space-y-12">
        <ScrollReveal className="text-center max-w-3xl mx-auto space-y-3">
          <h2 className="font-bold text-3xl sm:text-4xl tracking-tight text-slate-950">
            Why not just Excel or a generic CRM?
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Generic CRMs were built for software and real estate sales. Travel needs itineraries, quotes and vouchers.
          </p>
        </ScrollReveal>

        {/* Desktop table */}
        <div className="hidden md:block bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-sm">
                <th scope="col" className="py-4 px-6 font-semibold text-slate-500">Capability</th>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={`py-4 px-6 text-center font-bold ${
                      c.key === "ezzysync" ? "bg-brand-50 text-brand-700" : "text-slate-700"
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.name}>
                  <th scope="row" className="py-4 px-6 font-medium text-slate-900 text-[15px]">{row.name}</th>
                  {columns.map((c) => (
                    <td key={c.key} className={`py-4 px-6 text-center ${c.key === "ezzysync" ? "bg-brand-50/50" : ""}`}>
                      <Mark value={row[c.key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <ul className="md:hidden space-y-3">
          {rows.map((row) => (
            <li key={row.name} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="font-semibold text-slate-900 mb-3">{row.name}</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {columns.map((c) => (
                  <div
                    key={c.key}
                    className={`rounded-xl py-2.5 px-1 flex flex-col items-center gap-1.5 ${
                      c.key === "ezzysync" ? "bg-brand-50" : "bg-slate-50"
                    }`}
                  >
                    <Mark value={row[c.key]} />
                    <span className={`text-[11px] leading-tight ${c.key === "ezzysync" ? "font-bold text-brand-700" : "text-slate-600"}`}>
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <p className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> Built in</span>
          <span className="inline-flex items-center gap-1.5"><Minus className="w-4 h-4 text-amber-600" /> Partly / with add-ons</span>
          <span className="inline-flex items-center gap-1.5"><X className="w-4 h-4 text-rose-500" /> Not available</span>
        </p>

        <p className="text-center text-sm text-slate-600">
          In detail:{" "}
          <Link href="/compare/excel" className="font-semibold text-brand-600 hover:underline">Travel CRM vs Excel</Link>
          {" · "}
          <Link href="/compare/generic-crm" className="font-semibold text-brand-600 hover:underline">Travel CRM vs generic CRM</Link>
        </p>
      </div>
    </section>
  );
}

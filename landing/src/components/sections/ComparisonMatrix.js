import React from "react";
import Link from "next/link";
import { Check, X, Minus, ArrowUpRight } from "lucide-react";
import SectionHeading from "../common/SectionHeading";

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
const ICON = { yes: Check, partial: Minus, no: X };

function Mark({ value, strong }) {
  const Icon = ICON[value];
  return (
    <span className={`inline-flex items-center gap-2 ${value === "yes" ? (strong ? "text-ink-900" : "text-ink-700") : "text-ink-500"}`}>
      <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} aria-hidden="true" />
      <span className="sr-only">{statusLabel[value]}</span>
    </span>
  );
}

export default function ComparisonMatrix() {
  return (
    <section id="compare" className="section-y scroll-mt-20">
      <div className="wrap">
        <SectionHeading
          index="06"
          label="Compared"
          title="Why not just Excel or a generic CRM?"
          intro="Generic CRMs were built for software and real estate sales. Travel needs itineraries, quotes and vouchers."
        />

        <div data-reveal="fade" className="mt-[clamp(56px,7vw,112px)] overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-ink-900">
                <th scope="col" className="py-5 pr-6 t-label text-ink-600 font-medium w-[40%]">Capability</th>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={`py-5 px-6 font-display text-[22px] tracking-[-0.03em] font-normal ${
                      c.key === "ezzysync" ? "text-ink-900 bg-accent" : "text-ink-600"
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="border-b border-line">
                  <th scope="row" className="py-6 pr-6 font-normal text-[17px] text-ink-900">{row.name}</th>
                  {columns.map((c) => (
                    <td key={c.key} className={`py-6 px-6 ${c.key === "ezzysync" ? "bg-accent/10" : ""}`}>
                      <Mark value={row[c.key]} strong={c.key === "ezzysync"} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-[14px] text-ink-600">
          <p className="flex flex-wrap gap-x-6 gap-y-2">
            <span className="inline-flex items-center gap-2"><Check className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" /> Built in</span>
            <span className="inline-flex items-center gap-2"><Minus className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" /> Partly / with add-ons</span>
            <span className="inline-flex items-center gap-2"><X className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" /> Not available</span>
          </p>
          <p className="flex flex-wrap gap-x-6 gap-y-2 text-[16px] text-ink-900">
            <Link href="/compare/excel" className="group inline-flex items-center gap-1.5">
              <span className="link-line">Travel CRM vs Excel</span>
              <ArrowUpRight className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <Link href="/compare/generic-crm" className="group inline-flex items-center gap-1.5">
              <span className="link-line">Travel CRM vs generic CRM</span>
              <ArrowUpRight className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

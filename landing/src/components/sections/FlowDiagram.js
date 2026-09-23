"use client";

import React, { useState } from "react";
import { UserPlus, BellRing, Map, FileCheck, IndianRupee, Ticket } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

// Sample trip used across every step so the story reads as one booking.
const steps = [
  {
    id: "inquiry",
    icon: UserPlus,
    label: "Inquiry",
    title: "Lead captured automatically",
    body: "A WhatsApp message, Instagram ad form or website inquiry becomes a lead with source, destination and budget — no copy-paste.",
    card: {
      heading: "Rahul Sharma · New lead",
      rows: [
        ["Source", "WhatsApp"],
        ["Trip", "Goa · 2 Adults + 1 Child"],
        ["Budget", "₹45,000 – ₹55,000"],
        ["Assigned to", "Pooja (Sales)"],
      ],
    },
  },
  {
    id: "followup",
    icon: BellRing,
    label: "Follow-up",
    title: "Reminders so no lead goes cold",
    body: "Schedule a call or message, get reminded on time, and see the full chat and call history on one timeline.",
    card: {
      heading: "Today, 4:30 PM",
      rows: [
        ["Task", "Call about resort choice"],
        ["Last activity", "Sent 2 resort options"],
        ["Status", "Due today"],
      ],
    },
  },
  {
    id: "itinerary",
    icon: Map,
    label: "Itinerary",
    title: "Day-wise itinerary in minutes",
    body: "Build the trip day by day with hotels, sightseeing and transfers. Share it as a mobile link or a branded PDF.",
    card: {
      heading: "Goa 4N/5D Family Trip",
      rows: [
        ["Day 1", "Airport pickup & check-in"],
        ["Day 2", "North Goa forts & beaches"],
        ["Day 3", "Mandovi cruise"],
        ["Day 4", "Old Goa & spice farm"],
      ],
    },
  },
  {
    id: "quote",
    icon: FileCheck,
    label: "Quote",
    title: "Branded GST quote on WhatsApp",
    body: "Package cost, tax and per-person price calculated for you, on your agency letterhead, sent to the client in one click.",
    card: {
      heading: "Quote QT-089",
      rows: [
        ["Package", "₹46,190"],
        ["GST 5% (SAC 998555)", "₹2,310"],
        ["Total", "₹48,500"],
      ],
    },
  },
  {
    id: "payment",
    icon: IndianRupee,
    label: "Payment",
    title: "Advance & balance, always clear",
    body: "Record every advance and instalment against the trip and see exactly how much is still due before travel.",
    card: {
      heading: "Payment ledger",
      rows: [
        ["Advance (UPI)", "₹25,000 ✓"],
        ["Balance due", "₹23,500"],
        ["Due by", "5 Oct"],
      ],
    },
  },
  {
    id: "voucher",
    icon: Ticket,
    label: "Voucher",
    title: "Hotel & cab vouchers in 1 click",
    body: "Once booked, issue hotel vouchers and driver duty slips straight from the trip — no retyping details.",
    card: {
      heading: "Trip confirmed",
      rows: [
        ["Hotel voucher", "Issued ✓"],
        ["Driver duty slip", "Issued ✓"],
        ["Sent to client", "WhatsApp ✓"],
      ],
    },
  },
];

export default function FlowDiagram() {
  const [active, setActive] = useState(0);
  const step = steps[active];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-[#090d16] text-white scroll-mt-16">
      <div className="max-w-[1140px] mx-auto px-5 sm:px-6 space-y-12">
        <ScrollReveal className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-400 block">
            How it works
          </span>
          <h2 className="font-bold text-3xl sm:text-4xl tracking-tight">
            One booking, six steps, one system
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            Follow a Goa family trip from the first WhatsApp message to the hotel voucher.
          </p>
        </ScrollReveal>

        {/* Step rail */}
        <div className="relative">
          <div className="hidden md:block absolute left-[8%] right-[8%] top-7 h-px bg-slate-700" aria-hidden="true" />
          <div
            className="hidden md:block absolute left-[8%] top-7 h-px bg-brand-500 transition-all duration-500"
            style={{ width: `${(active / (steps.length - 1)) * 84}%` }}
            aria-hidden="true"
          />
          <div role="tablist" aria-label="Booking steps" className="relative grid grid-cols-3 md:grid-cols-6 gap-y-6 gap-x-2">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === active;
              const isDone = i < active;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  id={`flow-tab-${s.id}`}
                  aria-selected={isActive}
                  aria-controls="flow-panel"
                  onClick={() => setActive(i)}
                  className="flex flex-col items-center gap-2.5 group cursor-pointer"
                >
                  <span
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${
                      isActive
                        ? "bg-brand-600 border-brand-500 text-white shadow-[0_0_0_6px_rgba(234,88,12,0.2)]"
                        : isDone
                          ? "bg-slate-800 border-brand-500/60 text-brand-400"
                          : "bg-slate-900 border-slate-700 text-slate-400 group-hover:border-slate-500 group-hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </span>
                  <span className={`text-sm font-semibold ${isActive ? "text-white" : "text-slate-400"}`}>
                    <span className="text-slate-500 mr-1">{i + 1}.</span>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active step */}
        <div
          id="flow-panel"
          role="tabpanel"
          aria-labelledby={`flow-tab-${step.id}`}
          className="grid md:grid-cols-2 gap-8 md:gap-12 items-center bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10"
        >
          <div className="space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-400">
              Step {active + 1} of {steps.length}
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">{step.title}</h3>
            <p className="text-slate-300 text-base leading-relaxed">{step.body}</p>
            {active < steps.length - 1 && (
              <button
                type="button"
                onClick={() => setActive(active + 1)}
                className="text-sm font-semibold text-brand-400 hover:text-brand-300 cursor-pointer"
              >
                Next: {steps[active + 1].label} →
              </button>
            )}
          </div>

          <div className="bg-white text-slate-900 rounded-2xl p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <span className="font-bold text-base">{step.card.heading}</span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                EzzySync
              </span>
            </div>
            <dl className="divide-y divide-slate-100">
              {step.card.rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-semibold text-slate-900 text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";
import React from "react";
import { UserPlus, BellRing, Compass, FileCheck, CreditCard, CheckCircle2 } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

const lifecycleSteps = [
  {
    icon: UserPlus,
    title: "1. Lead",
    description: "Capture traveler inquiries instantly from WhatsApp, web forms, and campaigns into a centralized pipeline.",
  },
  {
    icon: BellRing,
    title: "2. Follow-up",
    description: "Track conversation timelines and schedule reminder alerts so no warm inquiry gets overlooked.",
  },
  {
    icon: Compass,
    title: "3. Itinerary",
    description: "Assemble day-by-day modular plans with hotel stays, transfers, sightseeing, and responsive public links.",
  },
  {
    icon: FileCheck,
    title: "4. Quotation",
    description: "Generate branded, GST-ready travel quotes with itemized cost breakdowns and payment terms in one click.",
  },
  {
    icon: CreditCard,
    title: "5. Payment",
    description: "Log milestone installments and reconcile advance deposits automatically via verified Razorpay webhooks.",
  },
  {
    icon: CheckCircle2,
    title: "6. Booking",
    description: "Convert approved quotations into confirmed trip bookings and generate client travel vouchers instantly.",
  },
];

export default function Workflow() {
  return (
    <section id="workflow" className="py-16 sm:py-28 bg-white border-b border-slate-200 relative z-10">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 space-y-12 sm:space-y-16">

        {/* Section Heading */}
        <ScrollReveal className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
            End-To-End Lifecycle
          </span>
          <h2 className="font-semibold text-3xl sm:text-4xl tracking-[-0.02em] text-slate-950">
            How EzzySync Works
          </h2>
          <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-[50ch] mx-auto">
            From the first inquiry to departure day: a unified 6-step workflow designed specifically for travel agencies.
          </p>
        </ScrollReveal>

        {/* 6 Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {lifecycleSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <ScrollReveal key={idx} delay={idx * 50}>
                <div className="h-full p-6 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all duration-200 bg-slate-50/50 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-brand-600 shadow-xs">
                      <Icon className="w-5 h-5" aria-hidden="true" focusable="false" />
                    </div>
                    <h3 className="font-semibold text-base sm:text-lg text-slate-900 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

      </div>
    </section>
  );
}

"use client";
import React from "react";
import { UserPlus, Compass, Share2 } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

const steps = [
  {
    icon: UserPlus,
    title: "Log travel inquiries",
    description: "Capture leads from your website or social media. Add contact details, destinations, passenger count, and budget brackets instantly.",
  },
  {
    icon: Compass,
    title: "Build custom itineraries",
    description: "Use the template engine to design day-by-day itineraries. Add hotels, flight routes, sightseeing tickets, and daily details in minutes.",
  },
  {
    icon: Share2,
    title: "Send invoices & alerts",
    description: "Generate PDF breakdown invoices with a single click. Send digital billing links and confirmations directly to clients on WhatsApp.",
  },
];

export default function Workflow() {
  return (
    <section id="workflow" className="py-16 sm:py-32 bg-white relative z-10">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 space-y-12 sm:space-y-16">

        {/* Section Heading */}
        <ScrollReveal className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="font-semibold text-3xl sm:text-4xl tracking-[-0.02em] text-slate-950">
            How EzzySync works
          </h2>
          <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-[50ch] mx-auto">
            From the initial inquiry to final booking confirmation, manage your entire workflow in three steps.
          </p>
        </ScrollReveal>

        {/* Workflow Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <ScrollReveal key={idx} delay={idx * 80}>
                <div className="h-full p-6 sm:p-7 rounded-2xl border border-slate-200 hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 ease-out">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-brand-600 flex-shrink-0">
                      <Icon className="w-4.5 h-4.5" aria-hidden="true" focusable="false" />
                    </div>
                    <span className="text-xs font-medium text-slate-400 tabular-nums">Step {idx + 1}</span>
                  </div>
                  <h3 className="font-semibold text-base sm:text-lg text-slate-900 tracking-tight">{step.title}</h3>
                  <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

      </div>
    </section>
  );
}

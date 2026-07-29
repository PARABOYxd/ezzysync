"use client";
import React from "react";
import {
  ClipboardList,
  MessageSquare,
  FileText,
  CheckCircle
} from "lucide-react";
import ScrollReveal from "../ScrollReveal";

const highlights = [
  {
    icon: ClipboardList,
    color: "text-brand-600",
    bg: "bg-brand-50",
    title: "Lead pipelines",
    description: "Organize and track bookings from first inquiry to trip completion without losing chat threads. Set client details, follow up on deals, and monitor pipelines in real time.",
    badge: "Pipeline tracking included",
  },
  {
    icon: MessageSquare,
    color: "text-brand-600",
    bg: "bg-brand-50",
    title: "WhatsApp notifications",
    description: "Send pre-configured text alerts and itinerary links directly using official Meta API keys. Automatically notify clients on lead updates or confirmed payments.",
    badge: "Official Cloud API support",
  },
  {
    icon: FileText,
    color: "text-amber-600",
    bg: "bg-amber-50",
    title: "Instant PDF invoices",
    description: "Generate PDF breakdown sheets, receipts, and invoices in seconds with a single click. Maintain structured billing routes, taxes, and balance payments.",
    badge: "One-click export",
  },
];

export default function Highlights() {
  return (
    <section aria-label="Core Features Highlights" className="bg-white py-14 sm:py-24 relative">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6">
        <h2 className="sr-only">Core Features Highlights</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {highlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <ScrollReveal key={idx} delay={idx * 80}>
                <div className="h-full p-6 sm:p-7 rounded-2xl border border-slate-200 hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 ease-out">
                  <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center ${item.color} flex-shrink-0`}>
                    <Icon className="w-5 h-5" aria-hidden="true" focusable="false" />
                  </div>
                  <h3 className="font-semibold text-base sm:text-lg text-slate-900 tracking-tight mt-4">
                    {item.title}
                  </h3>
                  <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" aria-hidden="true" focusable="false" />
                    <span>{item.badge}</span>
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

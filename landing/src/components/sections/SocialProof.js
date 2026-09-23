"use client";

import React from "react";
import { MessageSquare, Compass, CreditCard, Shield, FileText, CheckCircle2 } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

const verifiedCapabilities = [
  {
    icon: MessageSquare,
    title: "Centralized WhatsApp Business Inbox",
    description: "Operate through official Meta Cloud API so customer inquiries remain in your agency system, not on employee personal devices.",
  },
  {
    icon: Compass,
    title: "Modular Itinerary Architecture",
    description: "Build day-by-day plans from verified hotel and transport templates rather than formatting Word documents from scratch.",
  },
  {
    icon: CreditCard,
    title: "Milestone Ledger & Webhook Sync",
    description: "Record advance deposits and remaining balances with direct verification through your own Razorpay credentials.",
  },
  {
    icon: FileText,
    title: "Standard Travel Documentation",
    description: "Generate branded PDF quotations, travel vouchers, and tax invoices structured around tour operator SAC codes.",
  },
  {
    icon: Shield,
    title: "Multi-Tenant Data Privacy",
    description: "Strict database query isolation ensures that customer lists, bookings, and revenue records are visible only to your agency.",
  },
  {
    icon: CheckCircle2,
    title: "Zero Third-Party Message Markup",
    description: "Connect your official Meta developer account directly without paying monthly surcharges per WhatsApp conversation.",
  },
];

export default function SocialProof() {
  return (
    <section id="proof" className="py-16 sm:py-28 bg-white border-b border-slate-200 relative z-10 select-none">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 space-y-12">

        {/* Section Heading */}
        <ScrollReveal className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
            Verifiable Capabilities
          </span>
          <h2 className="font-semibold text-3xl sm:text-4xl tracking-[-0.02em] text-slate-950">
            Built Around the Real Workflow of Modern Travel Agencies
          </h2>
          <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-[55ch] mx-auto">
            Instead of adapting a generic sales CRM, EzzySync provides direct operational features built for the day-to-day realities of travel operations.
          </p>
        </ScrollReveal>

        {/* Capabilities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {verifiedCapabilities.map((item, idx) => {
            const Icon = item.icon;
            return (
              <ScrollReveal key={idx} delay={idx * 40}>
                <div className="h-full p-6 rounded-2xl border border-slate-200 bg-slate-50/40 hover:border-slate-300 transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-brand-600 shadow-xs">
                      <Icon className="w-5 h-5" aria-hidden="true" focusable="false" />
                    </div>
                    <h3 className="font-semibold text-base text-slate-900 tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                      {item.description}
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

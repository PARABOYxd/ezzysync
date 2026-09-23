"use client";

import React, { useState } from "react";
import {
  UserPlus,
  BellRing,
  Compass,
  FileCheck,
  CreditCard,
  CheckCircle2,
  User,
  Users,
  Globe2,
  Check,
  ArrowRight,
  MessageSquare,
  Calendar,
  Building2,
  Car,
  FileText,
  Clock,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import ScrollReveal from "../ScrollReveal";

const lifecycleSteps = [
  {
    step: "01",
    id: "inquiry",
    title: "Inquiry",
    shortName: "Inquiry",
    icon: UserPlus,
    badgeText: "Lead Ingestion & Attribution",
    heading: "Inbound Lead Capture from WhatsApp & Web",
    description:
      "Every inquiry from Meta WhatsApp ads, website forms, and Instagram campaigns lands directly into your unified inbox with zero manual copying.",
    highlights: [
      "Inbound WhatsApp lead auto-capture with message text",
      "Immediate campaign & source attribution tag",
      "Round-robin assignment to active sales coordinators",
    ],
    preview: {
      traveler: "Rahul Verma",
      phone: "+91 98201 44821",
      destination: "Goa (4N / 5D Beach & Heritage)",
      dates: "12 Oct – 16 Oct 2026",
      pax: "2 Adults • 1 Child",
      budget: "₹45,000 – ₹55,000",
      source: "WhatsApp Meta Cloud API",
      coordinator: "Pooja Sharma",
      status: "Fresh Inquiry",
      timeAgo: "2 mins ago",
      initialMessage: "Hi, want family package for North Goa resort with airport cab and breakfast.",
    },
  },
  {
    step: "02",
    id: "followup",
    title: "Follow-up",
    shortName: "Follow-up",
    icon: BellRing,
    badgeText: "Client Timeline & Cadence",
    heading: "Smart Reminders & Complete Activity History",
    description:
      "Sales coordinators never lose warm travelers to competitors. Timed reminder notifications and full conversation logs ensure structured follow-up.",
    highlights: [
      "Scheduled follow-up alerts with 1-click snooze or complete",
      "Complete WhatsApp and phone call timeline in one thread",
      "Overdue inquiry alerts directly on manager dashboard",
    ],
    preview: {
      traveler: "Rahul Verma",
      taskTitle: "Call regarding resort preference (Calangute vs Candolim)",
      scheduledTime: "Today at 4:30 PM",
      priority: "High Intent",
      lastInteraction: "Sent 2 resort options via WhatsApp (Viewed 11:24 AM)",
      timeline: [
        { time: "Yesterday, 05:15 PM", text: "Logged Call: Prefers 4-star beachfront with pool" },
        { time: "Today, 11:20 AM", text: "Sent 4N/5D preliminary package comparison" },
        { time: "Today, 04:30 PM", text: "Follow-up Call Scheduled (Pending)" },
      ],
    },
  },
  {
    step: "03",
    id: "itinerary",
    title: "Itinerary",
    shortName: "Itinerary",
    icon: Compass,
    badgeText: "Interactive Day-Wise Builder",
    heading: "Modular Day-by-Day Itineraries in Minutes",
    description:
      "Stop editing messy Word documents. Build day-wise plans with verified hotel stays, sightseeing stops, and transfer inclusions from reusable destination blocks.",
    highlights: [
      "Structured day-by-day itinerary with photo previews",
      "Reusable destination modules for Goa, Kerala, Kashmir, Himachal",
      "Interactive mobile web link for clients plus branded PDF",
    ],
    preview: {
      tripTitle: "5D/4N Goa Coastal & Heritage Experience",
      route: "North Goa • Old Goa • Mandovi Cruise",
      hotel: "Calangute Grand Beach Resort (4★)",
      days: [
        { day: "Day 01", title: "Arrival at MOPA Airport & Resort Check-in", tag: "Private Cab" },
        { day: "Day 02", title: "Fort Aguada, Chapora & Anjuna Sunset", tag: "Sightseeing" },
        { day: "Day 03", title: "Mandovi River Cruise & Watersports at Baga", tag: "Activities" },
        { day: "Day 04", title: "Old Goa Heritage Churches & Spice Plantation", tag: "Cultural" },
      ],
      shareUrl: "ezzysync.com/i/goa-4410",
    },
  },
  {
    step: "04",
    id: "quotation",
    title: "Quotation",
    shortName: "Quotation",
    icon: FileCheck,
    badgeText: "SAC 998555 Compliant",
    heading: "Itemized Branded Proposals with Tax Breakdown",
    description:
      "Generate crystal-clear travel quotations branded with your agency logo, exact room categories, inclusions, exclusions, and verified bank coordinates.",
    highlights: [
      "Itemized pricing with GST SAC 998555 (5% tour operator tax)",
      "Branded PDF generation with agency terms and bank details",
      "1-Click delivery directly to traveler's WhatsApp number",
    ],
    preview: {
      quoteNo: "QT-2026-GOA-089",
      client: "Rahul Verma",
      packageCost: "₹42,000",
      taxRate: "5% GST (SAC 998555)",
      taxAmount: "₹2,100",
      totalAmount: "₹44,100",
      perPerson: "₹22,050 / adult",
      inclusions: ["4N Accommodation", "Daily Buffet Breakfast", "AC Sedan Transfers", "Sunset Cruise Ticket"],
      status: "Proposal Ready",
    },
  },
  {
    step: "05",
    id: "payment",
    title: "Payment",
    shortName: "Payment",
    icon: CreditCard,
    badgeText: "Milestone Ledger & Sync",
    heading: "Milestone Installments & Razorpay Webhooks",
    description:
      "Manage advance booking deposits, mid-stage hotel payments, and final departure balances. Webhook integration automatically updates the ledger upon receipt.",
    highlights: [
      "3-tier milestone installment schedule with due dates",
      "Direct Razorpay webhook integration for automatic reconciliation",
      "Automated advance deposit receipts sent via WhatsApp",
    ],
    preview: {
      total: "₹44,100",
      received: "₹11,025",
      pending: "₹33,075",
      milestones: [
        { label: "Token Advance (25%)", amount: "₹11,025", status: "PAID", ref: "Razorpay #pay_82fka", date: "23 Sep 2026" },
        { label: "Hotel Confirmation (50%)", amount: "₹22,050", status: "DUE", ref: "Due 28 Sep 2026", date: "Scheduled" },
        { label: "Departure Balance (25%)", amount: "₹11,025", status: "DUE", ref: "Due 05 Oct 2026", date: "Scheduled" },
      ],
    },
  },
  {
    step: "06",
    id: "booking",
    title: "Booking",
    shortName: "Booking",
    icon: CheckCircle2,
    badgeText: "Operational Fulfillment",
    heading: "Confirmed Trip Bookings & Service Vouchers",
    description:
      "Convert the paid quotation into a confirmed trip. Issue hotel confirmation vouchers and driver duty slips with zero duplicate data entry.",
    highlights: [
      "1-Click quotation-to-confirmed-booking conversion",
      "Hotel service vouchers and driver duty slips with contact info",
      "Central departure calendar for ongoing operational tracking",
    ],
    preview: {
      bookingId: "BK-2026-4410",
      status: "Confirmed & Scheduled",
      departure: "12 Oct 2026",
      vouchers: [
        { type: "Hotel Voucher", name: "Calangute Grand Resort", ref: "Voucher #CGR-9982", status: "Confirmed" },
        { type: "Cab Duty Slip", name: "Driver: Rajesh K. (+91 94220...)", ref: "Innova Crysta • GA 03 X 9123", status: "Assigned" },
        { type: "Sightseeing Pass", name: "Mandovi Cruise (2 Adults)", ref: "Pass #MC-441", status: "Generated" },
      ],
    },
  },
];

const agencyPersonas = [
  {
    id: "solo",
    title: "Solo Travel Consultant",
    icon: User,
    badge: "1 User • Independent Agent",
    workload: "30 – 60 Inquiries / mo",
    summary: "Built for independent agents and travel designers managing their own client pipeline.",
    painSolved: "Replaces chaotic personal WhatsApp chats and unorganized spreadsheets with a single structured inquiry board.",
    benefits: [
      "Single visual pipeline replaces messy personal WhatsApp chats",
      "Day-wise itinerary builder generates proposals in minutes",
      "Timely follow-up alerts so high-intent travelers never drop off",
      "Milestone payment tracking with instant digital receipts",
    ],
    metrics: [
      { label: "Time Saved on Quotes", value: "70%" },
      { label: "Lead Response Speed", value: "< 5 mins" },
      { label: "Monthly Staff Overhead", value: "₹0" },
    ],
  },
  {
    id: "boutique",
    title: "Boutique Agency",
    icon: Users,
    badge: "3 – 15 Sales Coordinators",
    workload: "150 – 500 Inquiries / mo",
    summary: "Built for growing agency teams needing full visibility, accountability, and lead delegation.",
    painSolved: "Eliminates lost leads when coordinators rotate and provides managers with real-time conversion visibility.",
    benefits: [
      "Round-robin lead auto-assignment across sales coordinators",
      "Manager dashboard with real-time pipeline status and conversion metrics",
      "Permanent client timeline preserved even when staff leaves",
      "Standardized pricing rules and approved itinerary templates",
    ],
    metrics: [
      { label: "Lost Leads Due to Turnover", value: "0%" },
      { label: "Coordinator Productivity", value: "+3.2x" },
      { label: "Proposal Conversion", value: "+28%" },
    ],
  },
  {
    id: "dmc",
    title: "Tour Operator / DMC",
    icon: Globe2,
    badge: "15+ Operations & Field Staff",
    workload: "500 – 2,500 Bookings / mo",
    summary: "Built for destination management companies and operators managing multi-city logistics and vendor vouchers.",
    painSolved: "Replaces manual voucher generation, supplier coordination, and messy tax accounting with unified workflows.",
    benefits: [
      "Automated hotel vouchers and driver cab duty slip dispatch",
      "Multi-destination trip management (Himachal, Kashmir, Kerala, Dubai, Bali)",
      "SAC 998555 compliant GST invoicing and milestone balance tracking",
      "Departure master calendar for smooth operations during peak season",
    ],
    metrics: [
      { label: "Voucher Generation", value: "Instant" },
      { label: "GST SAC Compliance", value: "100%" },
      { label: "Peak Season Capacity", value: "+40%" },
    ],
  },
];

export default function TravelOSShowcase({ crmUrl }) {
  const [viewMode, setViewMode] = useState("lifecycle"); // "lifecycle" | "agency"
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [selectedPersonaId, setSelectedPersonaId] = useState("solo");

  const currentStep = lifecycleSteps[selectedStepIndex];
  const StepIcon = currentStep.icon;

  const currentPersona = agencyPersonas.find((p) => p.id === selectedPersonaId) || agencyPersonas[0];
  const PersonaIcon = currentPersona.icon;

  return (
    <section id="travel-os" className="py-20 sm:py-28 bg-[#f8fafc] text-slate-900 scroll-mt-16 relative border-y border-slate-200">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-6 relative z-10 space-y-12 sm:space-y-16">
        
        {/* Section Header */}
        <ScrollReveal className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
            Dedicated Travel Operating System
          </span>

          <h2 className="font-bold text-3xl sm:text-4xl lg:text-[2.6rem] tracking-[-0.03em] text-slate-950 leading-tight">
            Engineered Specifically for How Travel Sells
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-[58ch] mx-auto">
            Unlike generic CRM software, EzzySync connects every phase of a travel agency sale into one continuous, organized system.
          </p>

          {/* Primary View Mode Switcher */}
          <div className="pt-3 flex justify-center">
            <div className="inline-flex p-1.5 rounded-xl bg-slate-200/80 border border-slate-300/80 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode("lifecycle")}
                className={`px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  viewMode === "lifecycle"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                6-Step Booking Lifecycle
              </button>
              <button
                type="button"
                onClick={() => setViewMode("agency")}
                className={`px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  viewMode === "agency"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Built for Your Agency Type
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* ========================================================================= */}
        {/* MODE 1: 6-Step Connected Lifecycle Studio */}
        {/* ========================================================================= */}
        {viewMode === "lifecycle" && (
          <div className="space-y-8 max-w-5xl mx-auto">
            
            {/* Connected Step Navigation Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-2xs">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
                {lifecycleSteps.map((s, idx) => {
                  const Icon = s.icon;
                  const isSelected = selectedStepIndex === idx;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStepIndex(idx)}
                      className={`relative flex flex-col items-center justify-center py-3.5 px-2 rounded-xl transition-all duration-200 cursor-pointer text-center ${
                        isSelected
                          ? "bg-slate-950 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`text-[10px] font-mono font-bold ${isSelected ? "text-brand-400" : "text-slate-400"}`}>
                          {s.step}
                        </span>
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-brand-400" : "text-slate-500"}`} />
                      </div>
                      <span className="text-xs font-semibold whitespace-nowrap tracking-tight">
                        {s.shortName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Studio Card: Clean Frame with High-Contrast Mac Software Preview */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              
              {/* Left Column: Stage Explanation & Concrete Value */}
              <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-brand-50 border border-brand-200 text-brand-700 text-[11px] font-mono font-bold uppercase tracking-wider">
                    <span>Stage {currentStep.step} / 06</span>
                    <span>•</span>
                    <span>{currentStep.badgeText}</span>
                  </div>

                  <h3 className="font-bold text-xl sm:text-2xl text-slate-950 tracking-tight leading-snug">
                    {currentStep.heading}
                  </h3>

                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    {currentStep.description}
                  </p>

                  <div className="pt-2 space-y-2.5">
                    {currentStep.highlights.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-700">
                        <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                        <span className="font-medium leading-relaxed">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Zero Duplicate Data Entry
                  </span>
                  <span className="text-slate-400">Next: {lifecycleSteps[(selectedStepIndex + 1) % 6].shortName} →</span>
                </div>
              </div>

              {/* Right Column: Real Indian Travel CRM Screen Mockup inside Mac Chassis */}
              <div className="lg:col-span-7 p-5 sm:p-8 bg-slate-50 flex flex-col justify-center">
                
                {/* Mock Window Chassis */}
                <div className="bg-[#121724] rounded-xl border border-slate-800 shadow-xl overflow-hidden">
                  
                  {/* Window Bar */}
                  <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                      </div>
                      <span className="text-slate-400 font-mono text-[11px] ml-2 flex items-center gap-1.5">
                        <StepIcon className="w-3.5 h-3.5 text-brand-400" />
                        EzzySync Studio • {currentStep.title} Module
                      </span>
                    </div>
                    <span className="text-emerald-400 text-[10px] font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      LIVE STATE
                    </span>
                  </div>

                  {/* Window Body: Step-Specific Real Travel CRM Interface */}
                  <div className="p-4 sm:p-5 text-xs text-slate-300">
                    
                    {/* STEP 1 PREVIEW: INQUIRY */}
                    {currentStep.id === "inquiry" && (
                      <div className="space-y-3.5">
                        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                          <div>
                            <div className="text-white font-semibold text-sm flex items-center gap-2">
                              {currentStep.preview.traveler}
                              <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {currentStep.preview.status}
                              </span>
                            </div>
                            <div className="text-slate-400 text-[11px] mt-0.5 font-mono">{currentStep.preview.phone}</div>
                          </div>
                          <span className="text-slate-400 text-[10px] font-mono">{currentStep.preview.timeAgo}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Trip Package</span>
                            <span className="text-white font-medium">{currentStep.preview.destination}</span>
                          </div>
                          <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Travel Dates</span>
                            <span className="text-white font-medium">{currentStep.preview.dates}</span>
                          </div>
                          <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Pax & Budget</span>
                            <span className="text-white font-medium">{currentStep.preview.pax} • {currentStep.preview.budget}</span>
                          </div>
                          <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Assigned Agent</span>
                            <span className="text-brand-400 font-medium">{currentStep.preview.coordinator}</span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800 text-[11px] flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="text-slate-300 italic truncate">"{currentStep.preview.initialMessage}"</span>
                        </div>
                      </div>
                    )}

                    {/* STEP 2 PREVIEW: FOLLOW-UP */}
                    {currentStep.id === "followup" && (
                      <div className="space-y-3.5">
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-amber-300 font-semibold text-xs">Pending Reminder</span>
                            </div>
                            <p className="text-slate-200 text-xs font-medium">{currentStep.preview.taskTitle}</p>
                            <span className="text-slate-400 text-[10px] font-mono">Scheduled: {currentStep.preview.scheduledTime}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-semibold">
                            {currentStep.preview.priority}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-semibold">
                            Recent Traveler History
                          </div>
                          <div className="space-y-1.5 font-mono text-[11px]">
                            {currentStep.preview.timeline.map((item, idx) => (
                              <div key={idx} className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex items-start gap-2">
                                <span className="text-slate-400 flex-shrink-0 text-[10px]">{item.time}:</span>
                                <span className="text-slate-300">{item.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 3 PREVIEW: ITINERARY */}
                    {currentStep.id === "itinerary" && (
                      <div className="space-y-3.5">
                        <div className="flex items-start justify-between pb-2.5 border-b border-slate-800">
                          <div>
                            <div className="text-white font-semibold text-xs sm:text-sm">{currentStep.preview.tripTitle}</div>
                            <div className="text-slate-400 text-[11px] mt-0.5">{currentStep.preview.hotel}</div>
                          </div>
                          <span className="text-brand-400 text-[10px] font-mono bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                            Mobile Web Link
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {currentStep.preview.days.map((d, dIdx) => (
                            <div key={dIdx} className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-brand-400 font-mono text-[10px] font-bold">
                                  {d.day}
                                </span>
                                <span className="text-slate-200 font-medium truncate max-w-[260px] sm:max-w-xs">{d.title}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline-block">{d.tag}</span>
                            </div>
                          ))}
                        </div>

                        <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>Live Client URL: <span className="text-brand-300 underline">{currentStep.preview.shareUrl}</span></span>
                          <span className="text-emerald-400">PDF Ready ✓</span>
                        </div>
                      </div>
                    )}

                    {/* STEP 4 PREVIEW: QUOTATION */}
                    {currentStep.id === "quotation" && (
                      <div className="space-y-3.5">
                        <div className="flex items-start justify-between pb-2.5 border-b border-slate-800">
                          <div>
                            <div className="text-white font-semibold text-xs sm:text-sm">Proposal #{currentStep.preview.quoteNo}</div>
                            <div className="text-slate-400 text-[11px]">Client: {currentStep.preview.client}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                            {currentStep.preview.status}
                          </span>
                        </div>

                        <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                          <div className="flex justify-between text-slate-300">
                            <span>Base Package Price (2 Adults):</span>
                            <span>{currentStep.preview.packageCost}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Tour Operator GST (SAC 998555 @ 5%):</span>
                            <span>+ {currentStep.preview.taxAmount}</span>
                          </div>
                          <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-white text-xs">
                            <span>Total Itemized Quotation:</span>
                            <span className="text-emerald-400">{currentStep.preview.totalAmount}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1 text-[11px]">
                          <span className="px-2.5 py-1 rounded bg-brand-600/30 border border-brand-500/40 text-brand-300 font-medium">
                            Send via WhatsApp ➔
                          </span>
                          <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-medium">
                            Download Branded PDF
                          </span>
                        </div>
                      </div>
                    )}

                    {/* STEP 5 PREVIEW: PAYMENT */}
                    {currentStep.id === "payment" && (
                      <div className="space-y-3.5">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 text-[10px] font-mono uppercase block">Total Quoted</span>
                            <span className="text-white font-bold text-xs">{currentStep.preview.total}</span>
                          </div>
                          <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                            <span className="text-emerald-400 text-[10px] font-mono uppercase block">Received</span>
                            <span className="text-emerald-300 font-bold text-xs">{currentStep.preview.received}</span>
                          </div>
                          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                            <span className="text-amber-400 text-[10px] font-mono uppercase block">Pending Due</span>
                            <span className="text-amber-300 font-bold text-xs">{currentStep.preview.pending}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 font-mono text-[11px]">
                          {currentStep.preview.milestones.map((m, mIdx) => (
                            <div key={mIdx} className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                              <div>
                                <span className="text-slate-200 font-medium block">{m.label}</span>
                                <span className="text-slate-500 text-[10px]">{m.ref}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-white font-semibold block">{m.amount}</span>
                                <span className={`text-[10px] font-bold ${m.status === "PAID" ? "text-emerald-400" : "text-amber-400"}`}>
                                  {m.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* STEP 6 PREVIEW: BOOKING */}
                    {currentStep.id === "booking" && (
                      <div className="space-y-3.5">
                        <div className="flex items-start justify-between pb-2.5 border-b border-slate-800">
                          <div>
                            <div className="text-white font-semibold text-xs sm:text-sm">Booking Ref #{currentStep.preview.bookingId}</div>
                            <div className="text-slate-400 text-[11px]">Departure Date: {currentStep.preview.departure}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                            {currentStep.preview.status}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-semibold">
                            Dispatched Service Vouchers
                          </div>
                          <div className="space-y-1.5 font-mono text-[11px]">
                            {currentStep.preview.vouchers.map((v, vIdx) => (
                              <div key={vIdx} className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <div className="text-[10px] text-brand-400 font-semibold">{v.type}</div>
                                  <div className="text-white font-medium">{v.name}</div>
                                  <div className="text-slate-400 text-[10px]">{v.ref}</div>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                  {v.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Window Footer Status */}
                  <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      Trip State: Fully Reconciled
                    </span>
                    <span className="text-brand-400">Seamless CRM Handoff</span>
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: Agency Types (Built for Your Agency) */}
        {/* ========================================================================= */}
        {viewMode === "agency" && (
          <div className="space-y-8 max-w-5xl mx-auto">
            
            {/* Persona Switcher Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {agencyPersonas.map((persona) => {
                const Icon = persona.icon;
                const isSelected = selectedPersonaId === persona.id;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => setSelectedPersonaId(persona.id)}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-white border-brand-500 ring-2 ring-brand-500/20 shadow-sm text-slate-950"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? "bg-brand-50 text-brand-600 border border-brand-200" : "bg-slate-100 text-slate-500"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-slate-500">{persona.badge}</span>
                    </div>
                    <div className="font-bold text-sm text-slate-900">{persona.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{persona.workload}</div>
                  </button>
                );
              })}
            </div>

            {/* Persona Detailed Showcase Chassis */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-9 space-y-6">
              
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 flex-shrink-0">
                    <PersonaIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-slate-950 tracking-tight">
                      {currentPersona.title}
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-xl">
                      {currentPersona.summary}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono font-bold">Core Pain Solved</span>
                  <span className="font-semibold text-brand-700">{currentPersona.painSolved}</span>
                </div>
              </div>

              {/* 4 Concrete Operational Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {currentPersona.benefits.map((b, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-slate-800 leading-snug">{b}</span>
                  </div>
                ))}
              </div>

              {/* Real Metric Highlights */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {currentPersona.metrics.map((m, mIdx) => (
                  <div key={mIdx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-brand-600 font-bold text-lg sm:text-xl font-mono">{m.value}</div>
                    <div className="text-slate-600 text-[11px] mt-0.5 font-medium">{m.label}</div>
                  </div>
                ))}
              </div>

            </div>

          </div>
        )}

      </div>
    </section>
  );
}

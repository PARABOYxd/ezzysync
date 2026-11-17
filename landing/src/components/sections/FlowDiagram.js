"use client";

import React, { useState, useEffect, useRef } from "react";
import { UserPlus, BellRing, Map, FileCheck, IndianRupee, Ticket, Check } from "lucide-react";
import SectionHeading from "../common/SectionHeading";

// Sample trip used across every step so the story reads as one booking.
const steps = [
  {
    id: "inquiry",
    icon: UserPlus,
    label: "Inquiry",
    title: "Lead captured automatically",
    body: "A WhatsApp message, Instagram DM or website inquiry becomes a lead with source, destination and budget — no copy-paste.",
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

  const sectionRef = useRef(null);
  const intervalRef = useRef(null);
  const pausedRef = useRef(false);
  const userHasClickedRef = useRef(false);
  const activeRef = useRef(0);

  // Keep activeRef in sync with state; when the keyboard moved the
  // selection, move focus with it (roving tabindex).
  useEffect(() => {
    activeRef.current = active;
    const focused = document.activeElement;
    if (focused?.getAttribute("role") === "tab" && focused.id.startsWith("flow-tab-")) {
      document.getElementById(`flow-tab-${steps[active].id}`)?.focus();
    }
  }, [active]);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const startInterval = () => {
      if (intervalRef.current) return; // already running
      intervalRef.current = setInterval(() => {
        if (pausedRef.current || userHasClickedRef.current) return;
        setActive((prev) => (prev + 1) % steps.length);
      }, 4000);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startInterval();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      observer.disconnect();
    };
  }, []);

  const handleStepClick = (i) => {
    userHasClickedRef.current = true;
    setActive(i);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      userHasClickedRef.current = true;
      setActive((prev) => (prev + 1) % steps.length);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      userHasClickedRef.current = true;
      setActive((prev) => (prev - 1 + steps.length) % steps.length);
    }
  };

  return (
    <section id="how-it-works" ref={sectionRef} data-theme="dark" className="section-y bg-ink-900 text-paper scroll-mt-20">
      <div className="wrap">
        <SectionHeading
          tone="dark"
          index="03"
          label="How it works"
          title="One booking, six steps, one system"
          intro="Follow a Goa family trip from the first WhatsApp message to the hotel voucher."
        />

        {/* Pause auto-advance while the visitor hovers or focuses */}
        <div
          className="mt-[clamp(56px,7vw,112px)] grid-12 gap-y-12"
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { pausedRef.current = false; }}
          onFocus={() => { pausedRef.current = true; }}
          onBlur={() => { pausedRef.current = false; }}
        >
          {/* Step list */}
          <div
            role="tablist"
            aria-label="Booking steps"
            aria-orientation="vertical"
            onKeyDown={handleKeyDown}
            className="col-span-12 lg:col-span-5 border-t border-white/15"
          >
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === active;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  id={`flow-tab-${s.id}`}
                  aria-selected={isActive}
                  aria-controls="flow-panel"
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => handleStepClick(i)}
                  className={`group relative w-full flex items-center gap-5 py-5 border-b border-white/15 text-left transition-colors duration-500 ${
                    isActive ? "text-paper" : "text-white/45 hover:text-white/80"
                  }`}
                >
                  {/* progress bar for the active step */}
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 bottom-[-1px] h-px bg-accent transition-[width] duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isActive ? "w-full" : "w-0"
                    }`}
                  />
                  <span className="t-label tabular-nums w-8">0{i + 1}</span>
                  <span className="font-display text-[clamp(26px,2.6vw,40px)] tracking-[-0.04em] leading-none flex-1">{s.label}</span>
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1.5}
                    className={`w-5 h-5 transition-[opacity,transform] duration-500 ${isActive ? "opacity-100 text-accent" : "opacity-0 -translate-x-2"}`}
                  />
                </button>
              );
            })}
          </div>

          {/* Active step */}
          <div
            id="flow-panel"
            role="tabpanel"
            aria-labelledby={`flow-tab-${step.id}`}
            className="col-span-12 lg:col-start-7 lg:col-span-6"
          >
            <div key={step.id} className="fade-in-up">
              <p className="t-label text-white/50">
                Step {active + 1} of {steps.length}
              </p>
              <h3 className="t-h3 mt-5 text-paper">{step.title}</h3>
              <p className="mt-5 text-[17px] leading-relaxed text-white/65 max-w-lg">{step.body}</p>

              <div className="mt-10 rounded-2xl bg-paper text-ink-900 p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4 pb-5 border-b border-line">
                  <span className="font-display text-[22px] tracking-[-0.03em]">{step.card.heading}</span>
                  <span className="t-label text-ink-600 shrink-0">{step.label}</span>
                </div>
                <dl>
                  {step.card.rows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-4 py-3.5 border-b border-line last:border-0 text-[15px]">
                      <dt className="text-ink-600">{k}</dt>
                      <dd className="font-medium text-right inline-flex items-center gap-1.5">
                        {v.replace(" ✓", "")}
                        {v.endsWith("✓") && <Check className="w-4 h-4 text-emerald-700" strokeWidth={2} aria-label="done" />}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {active < steps.length - 1 && (
                <button
                  type="button"
                  onClick={() => handleStepClick(active + 1)}
                  className="mt-8 inline-flex items-center gap-2 min-h-11 text-[16px] text-paper"
                >
                  <span className="link-line">Next: {steps[active + 1].label}</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

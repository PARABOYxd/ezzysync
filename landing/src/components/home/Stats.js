import React from "react";
import { PLAN_PRICE_LABEL } from "@/data/plans";

// Big numbers, but only product facts that are true today. Customer counts
// or usage stats belong here once they come from real data.
const STATS = [
  { value: "6", unit: "steps", label: "From the first WhatsApp message to the hotel voucher, in one system." },
  { value: PLAN_PRICE_LABEL.SOLO, unit: "/month", label: "To start, with every feature included on the Solo Agent plan." },
  { value: "5", unit: "logins", label: "Your sales team on one shared WhatsApp number with Agency Growth." },
  { value: "0", unit: "% markup", label: "On WhatsApp messages. You pay Meta's own rates, nothing on top." },
];

export default function Stats() {
  return (
    <section data-theme="dark" className="section-y bg-ink-900 text-paper">
      <div className="wrap">
        <p className="t-label text-white/50">(04) In numbers</p>
        <ul className="mt-[clamp(48px,6vw,96px)] grid-12 gap-y-20">
          {STATS.map((s, i) => (
            <li
              key={s.unit}
              data-reveal="fade"
              className={`col-span-12 md:col-span-6 ${i % 2 === 1 ? "lg:col-start-7 lg:col-span-6 lg:mt-32" : "lg:col-span-6"} border-t border-white/15 pt-8`}
            >
              <div className="flex items-baseline gap-3">
                <span className="t-stat tabular-nums">{s.value}</span>
                <span className="font-display text-[clamp(22px,2.4vw,36px)] tracking-[-0.03em] text-accent">{s.unit}</span>
              </div>
              <p className="mt-6 max-w-sm text-[17px] leading-relaxed text-white/65">{s.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

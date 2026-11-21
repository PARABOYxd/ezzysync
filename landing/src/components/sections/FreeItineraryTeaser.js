import React from "react";
import Pill from "../ui/Pill";

const sampleDays = [
  ["Day 1", "Kochi", "Fort Kochi walk, Chinese fishing nets, Kathakali show"],
  ["Day 2", "Munnar", "Tea gardens, Eravikulam National Park"],
  ["Day 3", "Thekkady", "Spice plantation, Periyar boat ride"],
  ["Day 4", "Alleppey", "Overnight houseboat on the backwaters"],
];

/** Full-bleed accent band: the free itinerary tool, no sign-up needed. */
export default function FreeItineraryTeaser() {
  return (
    <section className="bg-accent text-ink-900">
      <div className="wrap py-[clamp(88px,11vw,176px)] grid-12 gap-y-14 items-end">
        <div className="col-span-12 lg:col-span-7">
          <p className="t-label">Free tool · No sign-up needed</p>
          <h2 data-split className="t-h2 mt-8">Try the itinerary builder without signing up</h2>
          <p className="mt-8 t-lead max-w-xl">
            Enter a destination and number of days. You get a day-wise plan you can download as a PDF and send to your
            client today.
          </p>
          <div className="mt-10">
            <Pill href="/free-itinerary-builder" className="[--btn-fill:var(--paper)] [--btn-fill-fg:var(--ink)]">
              Build a free itinerary
            </Pill>
          </div>
        </div>

        {/* What the tool produces */}
        <div aria-hidden="true" data-reveal="fade" className="col-span-12 lg:col-start-9 lg:col-span-4">
          <div className="rounded-2xl bg-paper-100 p-6 sm:p-7">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-[28px] tracking-[-0.04em] leading-none">Kerala, 4 days</span>
              <span className="t-label text-ink-600">PDF</span>
            </div>
            <ol className="mt-6">
              {sampleDays.map(([d, place, plan]) => (
                <li key={d} className="grid grid-cols-[4rem_1fr] gap-3 py-3 border-t border-line">
                  <span className="text-[13px] text-ink-600 pt-0.5">{d}</span>
                  <span>
                    <span className="block text-[15px] font-medium">{place}</span>
                    <span className="block text-[13px] text-ink-600 leading-snug">{plan}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

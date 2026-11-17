import React from "react";
import { Check, Search } from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";

/*
 * The hero "footage": the EzzySync pipeline drawn in code, with a WhatsApp
 * chat and a quote card floating over it on their own parallax layers.
 * Illustrative sample data only. Swap for a real screen recording
 * (public/images/screens) when one exists.
 */
const columns = [
  { title: "New inquiry", cards: [["Rahul Sharma", "Goa · 4N/5D · 3 pax", "₹48,500"], ["Priya Patel", "Kashmir · Honeymoon", "₹85,000"]] },
  { title: "Itinerary shared", cards: [["Amit Verma", "Dubai · Family of 4", "₹1,20,000"]] },
  { title: "Advance received", cards: [["Pooja Malhotra", "Kerala · ₹25,000 of ₹54,000", "₹54,000"]] },
  { title: "Vouchers issued", cards: [["Vikram Singh", "Manali · Hotel + cab", "₹72,000"]] },
];

export default function ProductShot() {
  return (
    <div className="relative w-full aspect-[4/5] sm:aspect-[16/10] lg:aspect-[16/8] bg-[#e4e0d7] overflow-hidden">
      {/* App window */}
      <div
        data-parallax="-6"
        className="absolute left-[4%] right-[4%] top-[7%] sm:left-[7%] sm:right-[16%] sm:top-[10%] bottom-[-6%] rounded-t-xl bg-paper-100 border border-ink-900/10 overflow-hidden"
      >
        <div className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 h-12 border-b border-line text-[13px]">
          <span className="font-display text-[17px] tracking-[-0.04em] text-ink-900">EzzySync</span>
          {["Leads", "Itineraries", "Quotes", "Payments"].map((t, i) => (
            <span key={t} className={`${i === 0 ? "text-ink-900 font-medium" : "text-ink-500"} ${i > 1 ? "hidden sm:inline" : ""}`}>
              {t}
            </span>
          ))}
          <span className="ml-auto hidden md:flex items-center gap-2 w-56 h-8 px-3 rounded-full border border-line text-ink-500">
            <Search className="w-3.5 h-3.5" strokeWidth={1.75} /> Search trips
          </span>
        </div>
        <div className="px-4 sm:px-6 pt-5 flex items-end justify-between gap-4">
          <div>
            <div className="font-display text-[clamp(22px,2.4vw,34px)] tracking-[-0.04em] leading-none text-ink-900">Leads pipeline</div>
            <div className="mt-1.5 text-[12px] text-ink-600">This month · 5 active trips</div>
          </div>
          <div className="hidden sm:flex gap-8 text-right">
            <div>
              <div className="t-label !text-[10px] text-ink-500">Pipeline</div>
              <div className="font-display text-xl tracking-[-0.03em] text-ink-900">₹3,79,500</div>
            </div>
            <div>
              <div className="t-label !text-[10px] text-ink-500">Advance</div>
              <div className="font-display text-xl tracking-[-0.03em] text-ink-900">₹97,000</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-6">
          {columns.map((col, i) => (
            <div key={col.title} className={`space-y-2.5 ${i > 1 ? "hidden lg:block" : ""}`}>
              <div className="flex items-center gap-2 text-[12px] text-ink-600">
                <span className={`w-1.5 h-1.5 rounded-full ${i === 3 ? "bg-emerald-600" : i === 0 ? "bg-accent" : "bg-ink-500"}`} />
                {col.title}
              </div>
              {col.cards.map(([name, meta, amt]) => (
                <div key={name} className="rounded-lg bg-white border border-line p-3">
                  <div className="text-[13px] font-medium text-ink-900">{name}</div>
                  <div className="text-[12px] text-ink-600 mt-0.5">{meta}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-ink-900">{amt}</span>
                    {i === 3 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                        <Check className="w-3 h-3" strokeWidth={2} /> Ready
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Floating WhatsApp message */}
      <div
        data-parallax="-22"
        className="absolute right-[5%] top-[46%] sm:top-[44%] w-[62%] sm:w-[30%] max-w-[340px] rounded-xl bg-white border border-ink-900/10 p-4 shadow-[0_30px_60px_-30px_rgba(17,17,17,0.35)]"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
            <WhatsAppIcon className="w-4 h-4" />
          </span>
          <div className="leading-tight">
            <div className="text-[13px] font-medium text-ink-900">Neha Kapoor</div>
            <div className="text-[11px] text-ink-600">New lead · Bali</div>
          </div>
        </div>
        <p className="mt-3 rounded-lg rounded-tl-sm bg-paper-100 px-3 py-2 text-[13px] text-ink-800 leading-snug">
          Looking for a Bali 5N/6D honeymoon in December. Budget around ₹1.2L.
        </p>
      </div>

      {/* Floating quote */}
      <div
        data-parallax="-34"
        className="hidden sm:block absolute right-[10%] bottom-[8%] w-[24%] max-w-[280px] rounded-xl bg-ink-900 text-paper p-4"
      >
        <div className="t-label !text-[10px] text-white/50">Quote QT-112</div>
        <div className="mt-2 flex justify-between text-[12px] text-white/70">
          <span>GST 5% · SAC 998555</span>
          <span>₹5,714</span>
        </div>
        <div className="mt-2 pt-2 border-t border-white/15 flex justify-between items-baseline">
          <span className="text-[12px] text-white/70">Total</span>
          <span className="font-display text-2xl tracking-[-0.03em]">₹1,20,000</span>
        </div>
      </div>
    </div>
  );
}

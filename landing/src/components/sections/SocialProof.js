import React from "react";
import ScrollReveal from "../ScrollReveal";

export default function SocialProof() {
  return (
    <section className="border-y border-slate-200 py-10 sm:py-14 relative z-10 select-none">
      <ScrollReveal className="max-w-[1100px] mx-auto px-5 sm:px-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-5 lg:gap-8">
          <span className="text-xs font-medium tracking-wide text-slate-400 text-center lg:text-left flex-shrink-0">
            Trusted by travel agencies across India
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 opacity-50">
            {/* TODO: Replace placeholders with real agency partner logos in SVG format */}
            <span className="text-sm font-semibold tracking-tight text-slate-500">Apex Travels</span>
            <span className="text-sm font-semibold tracking-tight text-slate-500">Bharat Holidays</span>
            <span className="text-sm font-semibold tracking-tight text-slate-500">Yatra Mitra</span>
            <span className="text-sm font-semibold tracking-tight text-slate-500">Royal Escapes</span>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

import React from "react";

export default function SocialProof() {
  return (
    <section className="bg-slate-100/50 border-y border-slate-200/60 py-8 relative z-10 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 text-center lg:text-left flex-shrink-0">
            Trusted by travel agencies across India
          </span>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 opacity-40">
            {/* TODO: Replace placeholders with real agency partner logos in SVG format */}
            <div className="text-xs sm:text-sm font-display font-semibold tracking-wider text-slate-600 border border-dashed border-slate-400 px-3 py-1 rounded">
              Apex Travels
            </div>
            <div className="text-xs sm:text-sm font-display font-semibold tracking-wider text-slate-600 border border-dashed border-slate-400 px-3 py-1 rounded">
              Bharat Holidays
            </div>
            <div className="text-xs sm:text-sm font-display font-semibold tracking-wider text-slate-600 border border-dashed border-slate-400 px-3 py-1 rounded">
              Yatra Mitra
            </div>
            <div className="text-xs sm:text-sm font-display font-semibold tracking-wider text-slate-600 border border-dashed border-slate-400 px-3 py-1 rounded">
              Royal Escapes
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

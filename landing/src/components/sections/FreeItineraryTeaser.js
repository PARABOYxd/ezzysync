import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, FileDown } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

const examples = ["Goa beach holiday", "Kerala backwaters", "Rajasthan heritage", "Manali & Himachal"];

export default function FreeItineraryTeaser() {
  return (
    <section className="pb-16 sm:pb-24 bg-white">
      <div className="max-w-[1140px] mx-auto px-5 sm:px-6">
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-orange-50 to-amber-50 border border-brand-200 p-7 sm:p-12 grid md:grid-cols-[1.3fr_1fr] gap-8 md:gap-12 items-center">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700">
                <Sparkles className="w-4 h-4" /> Free tool · No login required
              </span>
              <h2 className="font-bold text-3xl sm:text-4xl tracking-tight text-slate-950">
                Abhi try karo — bina signup ke
              </h2>
              <p className="text-slate-700 text-base sm:text-lg leading-relaxed">
                Enter a destination and number of days. Get a day-wise itinerary you can download as a PDF and send
                to your client today.
              </p>
              <Link
                href="/free-itinerary-builder"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[15px] transition-colors group"
              >
                Free itinerary banao
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="bg-white/80 backdrop-blur rounded-2xl border border-brand-100 p-5 sm:p-6 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Try it for</div>
              <div className="flex flex-wrap gap-2">
                {examples.map((e) => (
                  <span key={e} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700">
                    {e}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2 text-sm text-slate-600">
                <FileDown className="w-4 h-4 text-brand-600" /> Branded PDF download included
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

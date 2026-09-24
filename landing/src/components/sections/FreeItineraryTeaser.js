import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, FileDown } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

const examples = ["Goa beach holiday", "Kerala backwaters", "Rajasthan heritage", "Manali & Himachal"];

export default function FreeItineraryTeaser() {
  return (
    <section className="pb-16 sm:pb-24 bg-white">
      <div className="max-w-[1140px] mx-auto px-5 sm:px-6">
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-orange-50 to-amber-50 border border-brand-200 p-7 sm:p-12 grid md:grid-cols-[1.2fr_1fr] gap-8 md:gap-12 items-center">
            <div className="space-y-4 z-10">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700">
                <Sparkles className="w-4 h-4" /> Free tool · No login required
              </span>
              <h2 className="font-bold text-3xl sm:text-4xl tracking-tight text-slate-950">
                Try it now, no signup needed
              </h2>
              <p className="text-slate-700 text-base sm:text-lg leading-relaxed">
                Enter a destination and number of days. Get a day-wise itinerary you can download as a PDF and send
                to your client today.
              </p>
              <Link
                href="/free-itinerary-builder"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[15px] transition-colors group btn-press"
              >
                Create a Free Itinerary
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-brand-200 shadow-md bg-white card-hover">
              <div className="relative h-48 sm:h-56 w-full">
                <Image
                  src="/images/destinations.jpg"
                  alt="Popular Indian holiday destinations including Goa, Kerala, Kashmir, Rajasthan and Manali"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 100vw, 480px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <span className="absolute bottom-3 left-4 text-xs font-semibold text-white/90 uppercase tracking-wider drop-shadow-sm">
                  Popular Indian Destinations
                </span>
              </div>
              <div className="p-4 sm:p-5 space-y-3 bg-white/95 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Try it for</div>
                <div className="flex flex-wrap gap-2">
                  {examples.map((e) => (
                    <span key={e} className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-700">
                      {e}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-600 font-medium">
                  <FileDown className="w-3.5 h-3.5 text-brand-600" /> Branded PDF download included
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import SectionHeading from "../common/SectionHeading";
import { solutionPages } from "@/content/seoPages";

/*
 * "Selected work" for a product: the four kinds of business EzzySync is set
 * up for, each a large card with its outcome headline (the solution page's
 * h1). The media is typographic, so no stock photography is needed.
 */
const CARD = {
  "travel-agencies": { word: "Agencies", size: "text-[22cqw]", tone: "bg-accent text-ink-900", grid: "lg:col-span-7", aspect: "aspect-[4/3]" },
  "tour-operators": { word: "DMCs", size: "text-[35cqw]", tone: "bg-ink-900 text-paper", grid: "lg:col-start-9 lg:col-span-4 lg:mt-40", aspect: "aspect-[4/5]" },
  "travel-consultants": { word: "Solo", size: "text-[42cqw]", tone: "bg-[#e4e0d7] text-ink-900", grid: "lg:col-start-2 lg:col-span-5", aspect: "aspect-[4/5]" },
  "small-travel-businesses": { word: "Teams", size: "text-[34cqw]", tone: "bg-paper-200 text-ink-900", grid: "lg:col-start-7 lg:col-span-6 lg:mt-24", aspect: "aspect-[4/3]" },
};

export default function WhoItsFor() {
  return (
    <section className="section-y">
      <div className="wrap">
        <SectionHeading
          index="05"
          label="Who it's for"
          title="The same CRM, set up for how you sell"
          intro="Agencies, tour operators, solo consultants and small teams each get the pipeline, quotes and permissions they need."
        />

        <ul className="mt-[clamp(64px,8vw,128px)] grid-12 gap-y-16 lg:gap-y-24">
          {solutionPages.map((p) => {
            const c = CARD[p.slug] || { word: p.label, size: "text-[18cqw]", tone: "bg-paper-200", grid: "lg:col-span-6", aspect: "aspect-[4/3]" };
            return (
              <li key={p.slug} className={`col-span-12 md:col-span-6 ${c.grid}`}>
                <Link href={`/solutions/${p.slug}`} data-cursor="View" className="group block">
                  <div data-reveal="media" className={`media-frame @container ${c.aspect} ${c.tone}`}>
                    <div data-zoom className="absolute inset-0 transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]">
                      <span
                        aria-hidden="true"
                        className={`absolute left-[0.04em] -bottom-[0.16em] font-display leading-none tracking-[-0.06em] whitespace-nowrap ${c.size}`}
                      >
                        {c.word}
                      </span>
                    </div>
                    {/* Title that rises on hover */}
                    <div className="absolute inset-x-0 bottom-0 p-6 translate-y-full group-hover:translate-y-0 group-focus-visible:translate-y-0 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] bg-ink-900 text-paper flex items-center justify-between gap-4">
                      <span className="text-[15px]">See how it works for {p.label.toLowerCase()}</span>
                      <ArrowUpRight className="w-5 h-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                  </div>
                  <p className="mt-6 t-label text-ink-600">{p.label}</p>
                  <h3 className="mt-3 font-display text-[clamp(24px,2.2vw,34px)] leading-[1.1] tracking-[-0.03em] text-ink-900 max-w-[22ch] group-hover:text-brand-700 transition-colors duration-500">
                    {p.h1}
                  </h3>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

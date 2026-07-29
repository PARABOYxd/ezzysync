"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { faqData as defaultFaqData } from "../../data/landingData";
import ScrollReveal from "../ScrollReveal";

export default function FAQ({ items, heading = "Got questions? We have answers." }) {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const faqData = items || defaultFaqData;

  return (
    <section id="faq" className="py-16 sm:py-32 bg-slate-50">
      <div className="max-w-[720px] mx-auto px-5 sm:px-6 space-y-12">

        <ScrollReveal className="text-center space-y-3">
          <h2 className="font-semibold text-2xl sm:text-3xl tracking-[-0.02em] text-slate-950">
            {heading}
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={80} className="space-y-3">
          {faqData.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? -1 : idx)}
                aria-expanded={openFaqIndex === idx}
                aria-controls={`faq-answer-${idx}`}
                id={`faq-question-${idx}`}
                className="w-full text-left p-4 sm:p-5 font-medium text-slate-900 flex justify-between items-center gap-4 focus:outline-none hover:bg-slate-50/60 focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl cursor-pointer transition-colors"
              >
                <span className="text-sm sm:text-base">{item.q}</span>
                {openFaqIndex === idx ? (
                  <ChevronUp className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" aria-hidden="true" focusable="false" />
                ) : (
                  <ChevronDown className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" aria-hidden="true" focusable="false" />
                )}
              </button>
              <div
                id={`faq-answer-${idx}`}
                role="region"
                aria-labelledby={`faq-question-${idx}`}
                className={`px-4 sm:px-5 text-slate-500 text-sm border-t border-slate-100 leading-relaxed transition-all duration-300 overflow-hidden ${
                  openFaqIndex === idx ? "max-h-[400px] py-4 sm:py-5 opacity-100" : "max-h-0 py-0 opacity-0 border-t-0"
                }`}
              >
                {item.a}
              </div>
            </div>
          ))}
        </ScrollReveal>

      </div>
    </section>
  );
}

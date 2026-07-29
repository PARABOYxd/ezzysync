"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { faqData } from "../../data/landingData";

export default function FAQ() {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  return (
    <section id="faq" className="py-20 sm:py-28 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 block">Frequently Asked</span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Got Questions? We Have Answers.
          </h2>
        </div>

        <div className="space-y-4">
          {faqData.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? -1 : idx)}
                aria-expanded={openFaqIndex === idx}
                aria-controls={`faq-answer-${idx}`}
                id={`faq-question-${idx}`}
                className="w-full text-left p-4 sm:p-5 font-semibold text-slate-800 flex justify-between items-center focus:outline-none hover:bg-slate-50/50 focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl cursor-pointer"
              >
                <span className="text-xs sm:text-base pr-4">{item.q}</span>
                {openFaqIndex === idx ? (
                  <ChevronUp className="w-5 h-5 text-slate-500 flex-shrink-0" aria-hidden="true" focusable="false" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-500 flex-shrink-0" aria-hidden="true" focusable="false" />
                )}
              </button>
              <div
                id={`faq-answer-${idx}`}
                role="region"
                aria-labelledby={`faq-question-${idx}`}
                className={`px-4 sm:px-5 text-slate-650 text-xs sm:text-sm border-t border-slate-100 leading-relaxed bg-slate-50/30 transition-all duration-300 overflow-hidden ${
                  openFaqIndex === idx ? "max-h-[300px] py-4 sm:py-5 opacity-100" : "max-h-0 py-0 opacity-0 border-t-0"
                }`}
              >
                {item.a}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

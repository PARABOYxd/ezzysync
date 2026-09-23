"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { faqData as defaultFaqData } from "../../data/landingData";
import ScrollReveal from "../ScrollReveal";

export default function FAQ({ items, heading = "Frequently Asked Questions" }) {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const faqData = items || defaultFaqData;

  return (
    <section id="faq" className="py-20 sm:py-28 bg-[#fafafa] text-slate-900 border-t border-slate-200/80 scroll-mt-16">
      <div className="max-w-[760px] mx-auto px-5 sm:px-6 space-y-12">
        
        {/* Section Heading */}
        <ScrollReveal className="text-center space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
            Got Questions?
          </span>
          <h2 className="font-semibold text-3xl sm:text-4xl tracking-[-0.03em] text-slate-950">
            {heading}
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Direct answers to common operational questions from travel agency owners.
          </p>
        </ScrollReveal>

        {/* Minimalist Accordion */}
        <ScrollReveal delay={60} className="space-y-3">
          {faqData.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                  aria-expanded={isOpen}
                  className="w-full text-left p-5 sm:p-6 font-semibold text-slate-900 flex justify-between items-center gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                >
                  <span className="text-sm sm:text-[15px] leading-snug">{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-brand-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-slate-600 text-xs sm:text-sm leading-relaxed border-t border-slate-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </ScrollReveal>

        {/* Support Prompt */}
        <div className="pt-2 text-center">
          <p className="text-xs sm:text-sm text-slate-500">
            Have a question about your specific agency workflow?{" "}
            <a
              href="https://wa.me/918826610820?text=Hi%20EzzySync,%20I%20have%20a%20question%20about%20the%20travel%20CRM"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 font-semibold hover:underline"
            >
              Chat directly on WhatsApp with our team →
            </a>
          </p>
        </div>

      </div>
    </section>
  );
}

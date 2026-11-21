"use client";

import React, { useId, useState } from "react";
import { Plus } from "lucide-react";
import { faqData as defaultFaqData } from "../../data/landingData";
import { waLink, WA_QUESTION_TEXT } from "@/lib/contact";

/**
 * Accordion that opens smoothly (grid-template-rows 0fr -> 1fr). Every
 * answer stays in the HTML, so the FAQPage JSON-LD matches what is on the
 * page; closed answers are `inert`, so keyboard and screen readers skip them.
 */
export default function FAQ({ items, heading = "Frequently asked questions", bgClass = "", index = "09" }) {
  const [openIndex, setOpenIndex] = useState(0);
  const uid = useId();
  const faqData = items || defaultFaqData;

  return (
    <section id="faq" className={`section-y scroll-mt-20 ${bgClass}`}>
      <div className="wrap grid-12 gap-y-12">
        <div className="col-span-12 lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
          <p className="t-label text-ink-600">({index}) FAQ</p>
          <h2 data-split className="t-h2 mt-6 text-ink-900 text-balance !text-[clamp(40px,4.6vw,80px)]">{heading}</h2>
          <p className="mt-8 text-[16px] text-ink-600">
            Question not listed?{" "}
            <a href={waLink(WA_QUESTION_TEXT)} target="_blank" rel="noopener noreferrer" className="text-ink-900 link-line">
              Ask us on WhatsApp
            </a>
          </p>
        </div>

        <div className="col-span-12 lg:col-start-6 lg:col-span-7 border-t border-ink-900">
          {faqData.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="border-b border-line">
                <h3>
                  <button
                    type="button"
                    id={`${uid}-q${idx}`}
                    onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                    aria-expanded={isOpen}
                    aria-controls={`${uid}-a${idx}`}
                    className="group w-full min-h-11 flex items-center justify-between gap-8 py-7 text-left"
                  >
                    <span className="font-display text-[clamp(20px,1.8vw,28px)] leading-[1.2] tracking-[-0.025em] text-ink-900 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1.5">
                      {item.q}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-11 h-11 shrink-0 rounded-full border flex items-center justify-center transition-[transform,background-color,border-color,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isOpen ? "rotate-45 bg-ink-900 border-ink-900 text-paper" : "border-line text-ink-900 group-hover:border-ink-900"
                      }`}
                    >
                      <Plus className="w-4 h-4" strokeWidth={1.75} />
                    </span>
                  </button>
                </h3>
                <div
                  id={`${uid}-a${idx}`}
                  role="region"
                  aria-labelledby={`${uid}-q${idx}`}
                  inert={!isOpen}
                  className={`grid transition-[grid-template-rows] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p
                      className={`pb-8 pr-16 text-[17px] leading-relaxed text-ink-600 max-w-2xl transition-opacity duration-500 ${
                        isOpen ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

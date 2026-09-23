import React from "react";
import { Quote } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

/**
 * Real customer quotes only, each with the customer's written permission to
 * publish their name, agency and photo. The section renders nothing while
 * this list is empty - do not fill it with placeholder or invented people.
 *
 * Shape: { quote, name, role, agency, city, photo?: "/images/testimonials/x.jpg", metric?: "Quote time 1 hr → 5 min" }
 */
export const testimonials = [];

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Testimonials() {
  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="py-20 sm:py-28 bg-slate-50 border-y border-slate-200">
      <div className="max-w-[1140px] mx-auto px-5 sm:px-6 space-y-12">
        <ScrollReveal className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">Customers</span>
          <h2 className="font-bold text-3xl sm:text-4xl tracking-tight text-slate-950">
            Agencies that switched from Excel &amp; WhatsApp
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {testimonials.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 80}>
              <figure className="h-full bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 flex flex-col">
                <Quote className="w-7 h-7 text-brand-200" aria-hidden="true" />
                {t.metric && (
                  <div className="mt-4 inline-block self-start px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-semibold">
                    {t.metric}
                  </div>
                )}
                <blockquote className="mt-4 text-slate-800 text-base leading-relaxed flex-1">“{t.quote}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  {t.photo ? (
                    <img src={t.photo} alt="" className="w-11 h-11 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <span className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center">
                      {initials(t.name)}
                    </span>
                  )}
                  <div className="leading-tight">
                    <div className="font-semibold text-slate-900">{t.name}</div>
                    <div className="text-sm text-slate-500">
                      {t.role}, {t.agency} · {t.city}
                    </div>
                  </div>
                </figcaption>
              </figure>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

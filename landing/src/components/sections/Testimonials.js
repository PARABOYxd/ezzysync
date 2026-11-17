import React from "react";

/**
 * Real customer quotes only, each with the customer's written permission to
 * publish their name, agency and logo. The section renders nothing while
 * this list is empty - do not fill it with placeholder or invented people.
 *
 * Shape: { quote, name, role, agency, city, logo?: "/images/clients/x.svg", metric?: "Quote time 1 hr → 5 min" }
 * The agency's logo is shown instead of a portrait.
 */
export const testimonials = [];

export default function Testimonials() {
  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="section-y">
      <div className="wrap">
        <p className="t-label text-ink-600">Customers</p>
        <ul className="mt-[clamp(48px,6vw,96px)] space-y-[clamp(64px,8vw,128px)]">
          {testimonials.map((t) => (
            <li key={t.name}>
              <figure className="grid-12 gap-y-8">
                <div className="col-span-12 lg:col-span-3">
                  {t.logo ? (
                    <img src={t.logo} alt={t.agency} className="h-10 w-auto grayscale opacity-80" loading="lazy" />
                  ) : (
                    <span className="font-display text-2xl tracking-[-0.03em] text-ink-600">{t.agency}</span>
                  )}
                  {t.metric && <p className="mt-6 t-label text-ink-900">{t.metric}</p>}
                </div>
                <blockquote className="col-span-12 lg:col-span-9 font-display text-[clamp(28px,3.4vw,52px)] leading-[1.12] tracking-[-0.03em] text-ink-900">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="col-span-12 lg:col-start-4 lg:col-span-9 text-[15px] text-ink-600">
                  {t.name}, {t.role} · {t.agency}, {t.city}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Pill from "../ui/Pill";
import FAQ from "../sections/FAQ";
import Navbar from "../layout/Navbar";
import Footer from "../layout/Footer";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { getCrmUrl, getTrialUrl } from "@/lib/crmUrl";
import { waLink, WA_DEMO_TEXT } from "@/lib/contact";
import { SITE_URL, linkLabel } from "@/lib/siteLinks";
import { withSeo } from "@/lib/seoOverrides";
import { PLAN_PRICE_MONTHLY } from "@/data/plans";

const SECTION_NAME = { features: "Features", solutions: "Solutions" };

/** Metadata for a /features/* or /solutions/* page. */
export function seoPageMetadata(page, kind) {
  const path = `/${kind}/${page.slug}`;
  return withSeo(path, {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: `${SITE_URL}${path}`,
      siteName: "EzzySync",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: page.metaTitle, description: page.metaDescription },
  });
}

/**
 * Shared layout for feature and solution pages. Feature pages carry
 * `sections` + `steps`; solution pages carry `pains` + `fit` + `plan`.
 */
export default function SeoLandingPage({ page, kind }) {
  const crmUrl = getCrmUrl();
  const trialUrl = getTrialUrl(crmUrl);
  const path = `/${kind}/${page.slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: SECTION_NAME[kind], item: `${SITE_URL}/${kind}` },
        { "@type": "ListItem", position: 3, name: page.label, item: `${SITE_URL}${path}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink-900 font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar crmUrl={crmUrl} />

      <main>
        {/* Hero */}
        <section className="pt-[clamp(40px,7vw,112px)] pb-[clamp(56px,7vw,112px)] border-b border-line">
          <div className="wrap">
            <nav aria-label="Breadcrumb" className="t-label text-ink-600 fade-in-up">
              <ol className="flex flex-wrap items-center gap-2.5">
                <li><Link href="/" className="link-line hover:text-ink-900">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link href={`/${kind}`} className="link-line hover:text-ink-900">{SECTION_NAME[kind]}</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-ink-900" aria-current="page">{page.label}</li>
              </ol>
            </nav>
            <h1 className="t-h1 mt-8 text-ink-900 max-w-[18ch] text-balance" aria-label={page.h1}>
              {page.h1.split(" ").map((w, i) => (
                <React.Fragment key={i}>
                  <span className="word-mask" aria-hidden="true"><span style={{ "--i": i }}>{w}</span></span>{" "}
                </React.Fragment>
              ))}
            </h1>
            <div className="grid-12 gap-y-8 mt-[clamp(40px,5vw,72px)] items-end">
              <p className="col-span-12 md:col-span-7 lg:col-span-6 t-lead text-ink-600 fade-in-up" style={{ "--d": "400ms" }}>
                {page.intro}
              </p>
              <div className="col-span-12 md:col-span-5 lg:col-start-8 lg:col-span-5 flex flex-wrap items-center gap-x-6 gap-y-4 md:justify-end fade-in-up" style={{ "--d": "500ms" }}>
                <Pill href={trialUrl}>Start free trial</Pill>
                <a href={waLink(WA_DEMO_TEXT)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 min-h-11 text-[16px] text-ink-900">
                  <WhatsAppIcon className="w-4 h-4 text-emerald-700" />
                  <span className="link-line">Get a demo on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {page.pains && (
          <section className="section-y">
            <div className="wrap">
              <div className="grid-12 gap-y-8">
                <p className="col-span-12 lg:col-span-3 t-label text-ink-600 pt-3">(01) The problem</p>
                <h2 data-split className="col-span-12 lg:col-span-9 t-h2 text-ink-900">What usually goes wrong</h2>
              </div>
              <ol className="mt-[clamp(48px,6vw,96px)]">
                {page.pains.map((p, i) => (
                  <li key={p.title} className="grid-12 gap-y-4 py-10 border-t border-line last:border-b">
                    <span className="col-span-12 lg:col-span-1 t-label text-ink-600 pt-2 tabular-nums">0{i + 1}</span>
                    <h3 data-split className="col-span-12 md:col-span-6 lg:col-span-5 t-h3 text-ink-900">{p.title}</h3>
                    <p data-reveal="fade" className="col-span-12 md:col-span-6 lg:col-start-8 lg:col-span-5 text-[17px] leading-relaxed text-ink-600">{p.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {page.fit && (
          <section data-theme="dark" className="section-y bg-ink-900 text-paper">
            <div className="wrap">
              <div className="grid-12 gap-y-8">
                <p className="col-span-12 lg:col-span-3 t-label text-white/50 pt-3">(02) The fit</p>
                <h2 data-split className="col-span-12 lg:col-span-9 t-h2">How EzzySync fits</h2>
              </div>
              <ul data-stagger className="mt-[clamp(48px,6vw,96px)] border-t border-white/15">
                {page.fit.map((f) => (
                  <li key={f.title} className="border-b border-white/15">
                    <Link href={f.href} data-cursor="Explore" className="group grid-12 gap-y-3 py-9 items-baseline">
                      <h3 className="col-span-12 md:col-span-5 font-display text-[clamp(26px,2.6vw,40px)] tracking-[-0.035em] leading-[1.05] transition-[color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-accent group-hover:translate-x-2">
                        {f.title}
                      </h3>
                      <p className="col-span-11 md:col-start-7 md:col-span-5 text-[17px] leading-relaxed text-white/65">{f.body}</p>
                      <ArrowUpRight aria-hidden="true" strokeWidth={1.5} className="col-span-1 justify-self-end w-6 h-6 transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-10 text-[17px] text-white/75">
                <span className="text-paper">Suggested plan:</span> {page.plan}{" "}
                <Link href="/pricing" className="text-paper link-line">See pricing</Link>
              </p>
            </div>
          </section>
        )}

        {page.sections && (
          <section className="section-y">
            <div className="wrap space-y-[clamp(64px,8vw,128px)]">
              {page.sections.map((s, i) => (
                <article key={s.title} className="grid-12 gap-y-8">
                  <p className="col-span-12 lg:col-span-1 t-label text-ink-600 pt-3 tabular-nums">0{i + 1}</p>
                  <div className="col-span-12 lg:col-span-6">
                    <h2 data-split className="t-h3 text-ink-900 !text-[clamp(32px,3.6vw,56px)]">{s.title}</h2>
                    <p data-reveal="fade" className="mt-6 text-[17px] leading-relaxed text-ink-600 max-w-xl">{s.body}</p>
                  </div>
                  <ul data-stagger className="col-span-12 lg:col-start-8 lg:col-span-5 border-t border-line self-start">
                    {s.points.map((pt) => (
                      <li key={pt} className="py-4 border-b border-line text-[16px] text-ink-900">{pt}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        )}

        {page.steps && (
          <section data-theme="dark" className="section-y bg-ink-900 text-paper">
            <div className="wrap">
              <div className="grid-12 gap-y-8">
                <p className="col-span-12 lg:col-span-3 t-label text-white/50 pt-3">How it works</p>
                <h2 data-split className="col-span-12 lg:col-span-9 t-h2">In {page.steps.length} steps</h2>
              </div>
              <ol data-stagger className="mt-[clamp(48px,6vw,96px)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                {page.steps.map((step, i) => (
                  <li key={step} className="border-t border-white/15 pt-6">
                    <span className="t-stat !text-[clamp(64px,7vw,112px)] text-accent tabular-nums">{i + 1}</span>
                    <p className="mt-6 text-[17px] leading-relaxed text-white/75">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        <FAQ items={page.faqs} heading="Questions" index="03" />

        {/* Closing */}
        <section className="section-y border-t border-line">
          <div className="wrap grid-12 gap-y-14">
            <div className="col-span-12 lg:col-span-7">
              <p className="t-label text-ink-600">Start today</p>
              <h2 data-split className="t-h2 mt-6 text-ink-900">Try it on your own inquiries</h2>
              <p className="mt-8 t-lead text-ink-600 max-w-xl">
                Free trial, no credit card. Import your Excel leads and send your first quote today. Plans from{" "}
                {PLAN_PRICE_MONTHLY.SOLO}.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Pill href={trialUrl}>Start free trial</Pill>
                <Pill href="/pricing" variant="ghost">See pricing</Pill>
              </div>
            </div>
            <nav aria-label="Related pages" className="col-span-12 lg:col-start-9 lg:col-span-4 self-end">
              <h2 className="t-label !font-sans !tracking-[0.14em] text-ink-600">Related</h2>
              <ul className="mt-6 border-t border-line">
                {page.related.map((href) => (
                  <li key={href} className="border-b border-line">
                    <Link href={href} className="group flex items-center justify-between gap-4 py-4 text-[17px] text-ink-900">
                      <span className="link-line">{linkLabel(href) || href}</span>
                      <ArrowUpRight aria-hidden="true" strokeWidth={1.5} className="w-5 h-5 shrink-0 transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>
      </main>

      <Footer crmUrl={crmUrl} />
    </div>
  );
}

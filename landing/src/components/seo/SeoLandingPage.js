import React from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import Navbar from "../layout/Navbar";
import Footer from "../layout/Footer";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { getCrmUrl, getTrialUrl } from "@/lib/crmUrl";
import { waLink, WA_DEMO_TEXT } from "@/lib/contact";
import { SITE_URL, linkLabel } from "@/lib/siteLinks";
import { withSeo } from "@/lib/seoOverrides";

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
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar crmUrl={crmUrl} />

      <main>
        <section className="bg-[#fafbfc] border-b border-slate-200">
          <div className="max-w-[1000px] mx-auto px-5 sm:px-6 pt-10 pb-14 sm:pt-14 sm:pb-20">
            <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li><Link href="/" className="hover:text-slate-900">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link href={`/${kind}`} className="hover:text-slate-900">{SECTION_NAME[kind]}</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-slate-700" aria-current="page">{page.label}</li>
              </ol>
            </nav>
            <h1 className="mt-5 font-bold text-slate-950 text-3xl sm:text-5xl leading-[1.12] tracking-tight text-balance max-w-3xl">
              {page.h1}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">{page.intro}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href={trialUrl}
                className="px-7 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-[15px] flex items-center justify-center gap-2 btn-press"
              >
                Start free trial <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={waLink(WA_DEMO_TEXT)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-[15px] flex items-center justify-center gap-2 btn-press"
              >
                <WhatsAppIcon className="w-4 h-4 text-emerald-600" /> Get a demo on WhatsApp
              </a>
            </div>
          </div>
        </section>

        {page.pains && (
          <section className="py-14 sm:py-20 border-b border-slate-200">
            <div className="max-w-[1000px] mx-auto px-5 sm:px-6">
              <h2 className="font-bold text-2xl sm:text-3xl tracking-tight text-slate-950">What usually goes wrong</h2>
              <ol className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                {page.pains.map((p, i) => (
                  <li key={p.title} className="border-t-2 border-slate-300 pt-5">
                    <span className="text-sm font-semibold text-slate-400">0{i + 1}</span>
                    <h3 className="mt-2 font-bold text-lg text-slate-900">{p.title}</h3>
                    <p className="mt-2 text-[15px] text-slate-600 leading-relaxed">{p.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {page.fit && (
          <section className="py-14 sm:py-20 bg-slate-50 border-b border-slate-200">
            <div className="max-w-[1000px] mx-auto px-5 sm:px-6">
              <h2 className="font-bold text-2xl sm:text-3xl tracking-tight text-slate-950">How EzzySync fits</h2>
              <ul className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
                {page.fit.map((f) => (
                  <li key={f.title}>
                    <Link
                      href={f.href}
                      className="block h-full bg-white rounded-2xl border border-slate-200 p-6 hover:border-brand-400 transition-colors group"
                    >
                      <h3 className="font-bold text-slate-900 group-hover:text-brand-700">{f.title}</h3>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.body}</p>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-[15px] text-slate-700">
                <span className="font-semibold">Suggested plan:</span> {page.plan}{" "}
                <Link href="/pricing" className="text-brand-600 font-semibold hover:underline">See pricing</Link>
              </p>
            </div>
          </section>
        )}

        {page.sections && (
          <section className="py-14 sm:py-20 border-b border-slate-200">
            <div className="max-w-[1000px] mx-auto px-5 sm:px-6 space-y-14">
              {page.sections.map((s) => (
                <div key={s.title} className="grid md:grid-cols-[1.3fr_1fr] gap-6 md:gap-12">
                  <div>
                    <h2 className="font-bold text-2xl tracking-tight text-slate-950">{s.title}</h2>
                    <p className="mt-3 text-slate-600 leading-relaxed">{s.body}</p>
                  </div>
                  <ul className="space-y-2.5 md:pt-1">
                    {s.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2.5 text-[15px] text-slate-800">
                        <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {page.steps && (
          <section className="py-14 sm:py-20 bg-[#090d16] text-white">
            <div className="max-w-[1000px] mx-auto px-5 sm:px-6">
              <h2 className="font-bold text-2xl sm:text-3xl tracking-tight">How it works</h2>
              <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {page.steps.map((step, i) => (
                  <li key={step} className="border-t border-slate-700 pt-4">
                    <span className="text-sm font-semibold text-brand-400">Step {i + 1}</span>
                    <p className="mt-2 text-slate-200 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        <section className="py-14 sm:py-20 border-b border-slate-200">
          <div className="max-w-[760px] mx-auto px-5 sm:px-6">
            <h2 className="font-bold text-2xl sm:text-3xl tracking-tight text-slate-950">Questions</h2>
            <dl className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
              {page.faqs.map((f) => (
                <div key={f.q} className="py-5">
                  <dt className="font-semibold text-slate-900">{f.q}</dt>
                  <dd className="mt-2 text-[15px] text-slate-600 leading-relaxed">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="py-14 sm:py-16 bg-slate-50">
          <div className="max-w-[1000px] mx-auto px-5 sm:px-6 flex flex-col md:flex-row md:items-start md:justify-between gap-10">
            <div className="max-w-md">
              <h2 className="font-bold text-2xl tracking-tight text-slate-950">Try it on your own inquiries</h2>
              <p className="mt-2 text-slate-600">Free trial, no credit card. Import your Excel leads and send your first quote today.</p>
              <a
                href={trialUrl}
                className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm btn-press"
              >
                Start free trial <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <nav aria-label="Related pages">
              <h2 className="text-sm font-semibold text-slate-500">Related</h2>
              <ul className="mt-3 space-y-2">
                {page.related.map((href) => (
                  <li key={href}>
                    <Link href={href} className="text-brand-700 font-medium hover:underline">
                      {linkLabel(href) || href}
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

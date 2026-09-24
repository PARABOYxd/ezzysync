import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getCrmUrl, getTrialUrl } from "@/lib/crmUrl";
import { comparePages, getComparePage } from "@/content/comparePages";
import { SITE_URL, linkLabel } from "@/lib/siteLinks";
import { withSeo } from "@/lib/seoOverrides";

/** /compare/excel, /compare/generic-crm - see content/comparePages.js. */
export const dynamicParams = false;

export function generateStaticParams() {
  return comparePages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = getComparePage(slug);
  if (!page) return {};
  const path = `/compare/${slug}`;
  return withSeo(path, {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: path },
    openGraph: { title: page.metaTitle, description: page.metaDescription, url: `${SITE_URL}${path}`, siteName: "EzzySync", type: "article" },
    twitter: { card: "summary_large_image", title: page.metaTitle, description: page.metaDescription },
  });
}

export default async function ComparePage({ params }) {
  const { slug } = await params;
  const page = getComparePage(slug);
  if (!page) notFound();

  const crmUrl = getCrmUrl();
  const trialUrl = getTrialUrl(crmUrl);
  const path = `/compare/${slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: page.label, item: `${SITE_URL}${path}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar crmUrl={crmUrl} />
      <main>
        <section className="bg-[#fafbfc] border-b border-slate-200">
          <div className="max-w-[1000px] mx-auto px-5 sm:px-6 pt-10 pb-14 sm:pt-14 sm:pb-16">
            <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-900">Home</Link> <span aria-hidden="true">/</span>{" "}
              <span className="text-slate-700" aria-current="page">{page.label}</span>
            </nav>
            <h1 className="mt-5 font-bold text-slate-950 text-3xl sm:text-5xl leading-[1.12] tracking-tight text-balance max-w-3xl">
              {page.h1}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">{page.intro}</p>
          </div>
        </section>

        <section className="py-14 sm:py-20 border-b border-slate-200">
          <div className="max-w-[1000px] mx-auto px-5 sm:px-6">
            <h2 className="font-bold text-2xl sm:text-3xl tracking-tight text-slate-950">Side by side</h2>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-[15px] min-w-[560px]">
                <thead className="bg-slate-50 text-slate-900">
                  <tr>
                    <th scope="col" className="p-4 font-semibold w-1/4">&nbsp;</th>
                    <th scope="col" className="p-4 font-semibold text-brand-700">EzzySync (travel CRM)</th>
                    <th scope="col" className="p-4 font-semibold">{page.other}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {page.rows.map(([what, ours, theirs]) => (
                    <tr key={what}>
                      <th scope="row" className="p-4 font-medium text-slate-900 align-top">{what}</th>
                      <td className="p-4 text-slate-700 align-top">{ours}</td>
                      <td className="p-4 text-slate-600 align-top">{theirs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-[1000px] mx-auto px-5 sm:px-6 grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="font-bold text-2xl tracking-tight text-slate-950">{page.other} is enough if…</h2>
              <ul className="mt-5 space-y-3">
                {page.enough.map((x) => (
                  <li key={x} className="flex gap-2.5 text-[15px] text-slate-700"><Check className="w-5 h-5 text-slate-400 shrink-0" />{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-bold text-2xl tracking-tight text-slate-950">Time for a travel CRM when…</h2>
              <ul className="mt-5 space-y-3">
                {page.switchWhen.map((x) => (
                  <li key={x} className="flex gap-2.5 text-[15px] text-slate-800"><Check className="w-5 h-5 text-emerald-600 shrink-0" />{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

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
              <h2 className="font-bold text-2xl tracking-tight text-slate-950">Try it with your own inquiries</h2>
              <p className="mt-2 text-slate-600">
                Free trial, no credit card. <Link href="/pricing" className="text-brand-600 font-semibold hover:underline">See pricing</Link>.
              </p>
              <a href={trialUrl} className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm btn-press">
                Start free trial <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <nav aria-label="Related pages">
              <h2 className="text-sm font-semibold text-slate-500">Related</h2>
              <ul className="mt-3 space-y-2">
                {page.related.map((href) => (
                  <li key={href}>
                    <Link href={href} className="text-brand-700 font-medium hover:underline">{linkLabel(href) || href}</Link>
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

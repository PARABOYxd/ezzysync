import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getCrmUrl } from "@/lib/crmUrl";
import { solutionPages } from "@/content/seoPages";
import { SITE_URL } from "@/lib/siteLinks";
import { withSeo } from "@/lib/seoOverrides";

export const metadata = withSeo("/solutions", {
  title: "Travel CRM for Agencies, Tour Operators & Consultants | EzzySync",
  description:
    "See how EzzySync fits your kind of travel business — retail travel agencies, tour operators and DMCs, independent consultants, and small teams.",
  alternates: { canonical: "/solutions" },
});

export default function SolutionsPage() {
  const crmUrl = getCrmUrl();
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Solutions", item: `${SITE_URL}/solutions` },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <Navbar crmUrl={crmUrl} />
      <main className="max-w-[1000px] mx-auto px-5 sm:px-6 py-14 sm:py-20">
        <h1 className="font-bold text-3xl sm:text-5xl tracking-tight text-slate-950">Who EzzySync is for</h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl">
          The same CRM, set up differently depending on how your travel business runs.
        </p>
        <ul className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {solutionPages.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/solutions/${p.slug}`}
                className="block h-full rounded-2xl border border-slate-200 p-6 hover:border-brand-400 transition-colors group"
              >
                <h2 className="font-bold text-xl text-slate-900 group-hover:text-brand-700">{p.label}</h2>
                <p className="mt-2 text-[15px] text-slate-600 leading-relaxed">{p.metaDescription}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                  Read more <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

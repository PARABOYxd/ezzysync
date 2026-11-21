import React from "react";
import PageHero, { heroPrimaryClass, heroSecondaryClass } from "@/components/common/PageHero";
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
    <div className="min-h-screen bg-paper text-ink-900 font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <Navbar crmUrl={crmUrl} />
      <main>
        <PageHero
          code="Who it's for"
          label="Solutions"
          title="Who EzzySync is for"
          intro="The same CRM, set up differently depending on how your travel business runs."
        />
        <div className="wrap section-y">
        <ul data-stagger className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          {solutionPages.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/solutions/${p.slug}`}
                data-cursor="View" className="block h-full border-t border-ink-900 pt-8 pb-10 group"
              >
                <h2 className="t-h3 text-ink-900 transition-colors duration-500 group-hover:text-brand-700">{p.label}</h2>
                <p className="mt-5 text-[17px] text-ink-600 leading-relaxed max-w-lg">{p.metaDescription}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-[16px] text-ink-900">
                  <span className="link-line">Read more</span> <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        </div>
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

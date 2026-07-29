import React from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Pricing from "../../components/sections/Pricing";
import FAQ from "../../components/sections/FAQ";
import { faqData } from "../../data/landingData";

export const metadata = {
  title: "Travel CRM Pricing — EzzySync Plans & Free Tier",
  description: "EzzySync pricing for travel agencies: a free Starter plan for up to 100 leads, an Agency Growth plan with a 7-day trial, and custom Enterprise pricing for large teams.",
  alternates: {
    canonical: "/pricing",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Travel CRM Pricing — EzzySync Plans & Free Tier",
    description: "EzzySync pricing for travel agencies: a free Starter plan for up to 100 leads, an Agency Growth plan with a 7-day trial, and custom Enterprise pricing for large teams.",
    url: "https://www.ezzysync.com/pricing",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Travel CRM Pricing — EzzySync Plans & Free Tier",
    description: "EzzySync pricing for travel agencies: a free Starter plan for up to 100 leads, an Agency Growth plan with a 7-day trial, and custom Enterprise pricing for large teams.",
  },
};

export default function PricingPage() {
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";
  const pricingFaqs = faqData.filter((item) => item.category === "pricing");

  const pageJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.ezzysync.com/" },
        { "@type": "ListItem", "position": 2, "name": "Pricing", "item": "https://www.ezzysync.com/pricing" }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": pricingFaqs.map((item) => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.a
        }
      }))
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <Navbar crmUrl={crmUrl} />
      <main>
        <section className="pt-20 pb-4 sm:pt-28 bg-white">
          <div className="max-w-[46rem] mx-auto px-5 sm:px-6 text-center space-y-5">
            <h1 className="load-in font-semibold text-slate-950 text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.1] tracking-[-0.02em]">
              Travel CRM pricing for every agency size
            </h1>
            <p className="load-in text-slate-500 text-lg leading-relaxed max-w-[55ch] mx-auto" style={{ "--reveal-delay": "100ms" }}>
              Start free, upgrade when your booking volume grows. No hidden fees on the Starter plan.
            </p>
          </div>
        </section>
        <Pricing crmUrl={crmUrl} />
        <FAQ items={pricingFaqs} heading="Pricing questions, answered" />
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

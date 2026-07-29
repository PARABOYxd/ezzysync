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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <Navbar crmUrl={crmUrl} />
      <main>
        <section className="pt-14 pb-4 sm:pt-20 bg-gradient-to-b from-slate-50 via-white to-slate-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              Travel CRM Pricing for Every Agency Size
            </h1>
            <p className="text-slate-600 text-sm sm:text-lg max-w-2xl mx-auto">
              Start free, upgrade when your booking volume grows. No hidden fees on the Starter plan.
            </p>
          </div>
        </section>
        <Pricing crmUrl={crmUrl} />
        <FAQ items={pricingFaqs} heading="Pricing Questions, Answered" />
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

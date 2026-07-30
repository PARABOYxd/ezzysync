import React from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Features from "../../components/sections/Features";
import WhyEzzySync from "../../components/sections/WhyEzzySync";
import FAQ from "../../components/sections/FAQ";
import { faqData } from "../../data/landingData";

export const metadata = {
  title: "Travel CRM Features — Lead Management, Itineraries & Invoicing | EzzySync",
  description: "See every EzzySync feature: lead pipeline tracking, day-wise itinerary builder, automated WhatsApp alerts, PDF invoicing, and multi-tenant data isolation for travel agencies.",
  alternates: {
    canonical: "/features",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Travel CRM Features — Lead Management, Itineraries & Invoicing | EzzySync",
    description: "See every EzzySync feature: lead pipeline tracking, day-wise itinerary builder, automated WhatsApp alerts, PDF invoicing, and multi-tenant data isolation for travel agencies.",
    url: "https://www.ezzysync.com/features",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Travel CRM Features — Lead Management, Itineraries & Invoicing | EzzySync",
    description: "See every EzzySync feature: lead pipeline tracking, day-wise itinerary builder, automated WhatsApp alerts, PDF invoicing, and multi-tenant data isolation for travel agencies.",
  },
};

export default function FeaturesPage() {
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";
  const featureFaqs = faqData.filter((item) => item.category === "feature");

  const pageJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.ezzysync.com/" },
        { "@type": "ListItem", "position": 2, "name": "Features", "item": "https://www.ezzysync.com/features" }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": featureFaqs.map((item) => ({
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
        <section className="relative pt-24 pb-12 sm:pt-32 sm:pb-16 bg-white bg-grid-pattern overflow-hidden">
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[320px] h-[320px] rounded-full bg-brand-100/40 filter blur-[90px] -z-10" aria-hidden="true"></div>
          <div className="max-w-[46rem] mx-auto px-5 sm:px-6 text-center space-y-6">
            <span className="load-in inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 border border-brand-200" style={{ "--reveal-delay": "0ms" }}>
              ✨ Core Capabilities
            </span>
            <h1 className="load-in font-semibold text-slate-950 text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.1] tracking-[-0.02em]" style={{ "--reveal-delay": "100ms" }}>
              Travel CRM features built for booking management
            </h1>
            <p className="load-in text-slate-500 text-base sm:text-lg leading-relaxed max-w-[55ch] mx-auto" style={{ "--reveal-delay": "200ms" }}>
              Every feature below is built around the actual travel agency workflow — lead intake, itinerary
              building, invoicing, and client updates — instead of generic CRM tooling.
            </p>
          </div>
        </section>
        <Features />
        <WhyEzzySync />
        <FAQ items={featureFaqs} heading="Feature questions, answered" />
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

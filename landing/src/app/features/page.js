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
              Travel CRM Features Built for Booking Management
            </h1>
            <p className="text-slate-600 text-sm sm:text-lg max-w-2xl mx-auto">
              Every feature below is built around the actual travel agency workflow — lead intake, itinerary
              building, invoicing, and client updates — instead of generic CRM tooling.
            </p>
          </div>
        </section>
        <Features />
        <WhyEzzySync />
        <FAQ items={featureFaqs} heading="Feature Questions, Answered" />
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

import React from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Problem from "../../components/sections/Problem";
import FAQ from "../../components/sections/FAQ";
import { faqData } from "../../data/landingData";

export const metadata = {
  title: "About EzzySync — Travel CRM Built for Travel Agencies",
  description: "EzzySync is a travel CRM and booking management platform built for independent travel agents, small agencies, and tour operators moving off spreadsheets and generic CRMs.",
  alternates: {
    canonical: "/about",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "About EzzySync — Travel CRM Built for Travel Agencies",
    description: "EzzySync is a travel CRM and booking management platform built for independent travel agents, small agencies, and tour operators moving off spreadsheets and generic CRMs.",
    url: "https://www.ezzysync.com/about",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About EzzySync — Travel CRM Built for Travel Agencies",
    description: "EzzySync is a travel CRM and booking management platform built for independent travel agents, small agencies, and tour operators moving off spreadsheets and generic CRMs.",
  },
};

export default function AboutPage() {
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";
  const generalFaqs = faqData.filter((item) => item.category === "general");

  const pageJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.ezzysync.com/" },
        { "@type": "ListItem", "position": 2, "name": "About", "item": "https://www.ezzysync.com/about" }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": generalFaqs.map((item) => ({
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
              👋 Our Mission
            </span>
            <h1 className="load-in font-semibold text-slate-950 text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.1] tracking-[-0.02em]" style={{ "--reveal-delay": "100ms" }}>
              About EzzySync
            </h1>
            <p className="load-in text-slate-500 text-base sm:text-lg leading-[1.65] max-w-[55ch] mx-auto" style={{ "--reveal-delay": "200ms" }}>
              EzzySync is a travel CRM and booking management platform that helps travel agencies manage leads,
              bookings, and itineraries in one system. It's built for independent travel agents, small and
              mid-size travel agencies, and tour operators — the agencies currently running their business out
              of spreadsheets, scattered WhatsApp chat history, or a generic sales CRM that was never designed
              for travel.
            </p>
            <p className="load-in text-slate-500 text-base sm:text-lg leading-[1.65] max-w-[55ch] mx-auto" style={{ "--reveal-delay": "260ms" }}>
              Every part of EzzySync maps to a real step in a travel booking: log the inquiry, build a day-wise
              itinerary, send it to the client on WhatsApp, generate the invoice, and track the booking through
              to departure. Each agency's data is isolated with strict multi-tenant access controls at the
              database level, so no agency can ever read or write another agency's bookings.
            </p>
          </div>
        </section>
        <Problem />
        <FAQ items={generalFaqs} heading="Common questions about EzzySync" />
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

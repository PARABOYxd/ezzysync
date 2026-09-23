import React from "react";
import Navbar from "../components/layout/Navbar";
import Hero from "../components/sections/Hero";
import Problem from "../components/sections/Problem";
import ProductTour from "../components/sections/ProductTour";
import ComparisonMatrix from "../components/sections/ComparisonMatrix";
import TravelOSShowcase from "../components/sections/TravelOSShowcase";
import Pricing from "../components/sections/Pricing";
import LiveDemoSection from "../components/sections/LiveDemoSection";
import FAQ from "../components/sections/FAQ";
import Footer from "../components/layout/Footer";
import { getCrmUrl } from "@/lib/crmUrl";
import { PLAN_PRICE_RUPEES } from "@/data/plans";
import { faqData } from "@/data/landingData";

export default function Home() {
  const crmUrl = getCrmUrl();

  const pageJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqData.map((item) => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.a
        }
      }))
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "EzzySync Travel CRM",
      "url": "https://www.ezzysync.com",
      "logo": "https://www.ezzysync.com/logo.png",
      "telephone": "+91-8826610820",
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+91-8826610820",
        "email": "support@ezzysync.com",
        "contactType": "customer service"
      },
      "sameAs": [
        "https://www.instagram.com/ezzysync?igsh=MXRpcmJlYnR2aHc4NQ==",
        "https://www.facebook.com/share/1BtkdG3H7G/?mibextid=wwXIfr"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "EzzySync Travel CRM",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": "https://www.ezzysync.com",
      "description": "The #1 Travel CRM Software in India for tour operators and travel agents. Automate WhatsApp leads, generate day-wise itineraries, issue GST quotations, and track bookings.",
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": "INR",
        "lowPrice": PLAN_PRICE_RUPEES.SOLO,
        "highPrice": PLAN_PRICE_RUPEES.PRO,
        "offerCount": "2",
        "offers": [
          {
            "@type": "Offer",
            "name": "Solo Agent Plan",
            "price": PLAN_PRICE_RUPEES.SOLO,
            "priceCurrency": "INR"
          },
          {
            "@type": "Offer",
            "name": "Agency Growth Pro Plan",
            "price": PLAN_PRICE_RUPEES.PRO,
            "priceCurrency": "INR"
          }
        ]
      }
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
        {/* 1. Commercial Hero with Live Float Widgets & Lead Sources */}
        <Hero crmUrl={crmUrl} />

        {/* 2. Before vs After: Disconnected Manual Operations vs EzzySync */}
        <Problem />

        {/* 3. Interactive Live Studio Tour */}
        <ProductTour />

        {/* 4. Comparison: EzzySync vs Generic CRMs & Disconnected Tools */}
        <ComparisonMatrix crmUrl={crmUrl} />

        {/* 5. Travel Operating System (Lifecycle + Agency Personas) */}
        <TravelOSShowcase crmUrl={crmUrl} />

        {/* 6. Predictable Transparent Pricing */}
        <Pricing crmUrl={crmUrl} />

        {/* 7. 1-on-1 Personalized Live Demo & WhatsApp Consultation */}
        <LiveDemoSection crmUrl={crmUrl} />

        {/* 8. Objection-Busting FAQ */}
        <FAQ />
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

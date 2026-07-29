import React from "react";
import Navbar from "../components/layout/Navbar";
import Hero from "../components/sections/Hero";
import Highlights from "../components/sections/Highlights";
import Workflow from "../components/sections/Workflow";
import WhatsAppDemo from "../components/sections/WhatsAppDemo";
import SocialProof from "../components/sections/SocialProof";
import PageTeaser from "../components/sections/PageTeaser";
import Footer from "../components/layout/Footer";

export default function Home() {
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";

  const pageJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "EzzySync",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": "https://www.ezzysync.com",
      "description": "Scale your travel agency. Centralize leads, build professional itineraries, generate invoices, and automate WhatsApp updates. Start for free.",
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": "INR",
        "lowPrice": "0",
        "highPrice": "2499",
        "offerCount": "3",
        "offers": [
          {
            "@type": "Offer",
            "name": "Free Starter Plan",
            "price": "0",
            "priceCurrency": "INR"
          },
          {
            "@type": "Offer",
            "name": "Agency Growth Plan",
            "price": "2499",
            "priceCurrency": "INR"
          },
          {
            "@type": "Offer",
            "name": "Custom Enterprise Plan",
            "price": "0",
            "priceCurrency": "INR",
            "description": "Contact for pricing"
          }
        ]
      }
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
        <Hero crmUrl={crmUrl} />
        <Highlights />
        <Workflow />
        <WhatsAppDemo />
        <SocialProof />
        <PageTeaser
          eyebrow="Feature Rich"
          title="Everything Your Travel Agency Needs"
          description="Lead pipeline, day-wise itinerary builder, automated WhatsApp alerts, PDF invoicing, and multi-tenant data isolation — see the full feature breakdown."
          href="/features"
          linkText="Explore All Features"
          bg="bg-white"
        />
        <PageTeaser
          eyebrow="Pricing Plans"
          title="Fair Pricing for Travel Agencies"
          description="Start free with up to 100 leads. Upgrade to Agency Growth for unlimited leads and WhatsApp API integration when your booking volume grows."
          href="/pricing"
          linkText="View Pricing Plans"
          bg="bg-slate-50"
        />
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

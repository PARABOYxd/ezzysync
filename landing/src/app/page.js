import React from "react";
import Navbar from "../components/layout/Navbar";
import Hero from "../components/sections/Hero";
import Highlights from "../components/sections/Highlights";
import Workflow from "../components/sections/Workflow";
import WhatsAppDemo from "../components/sections/WhatsAppDemo";
import SocialProof from "../components/sections/SocialProof";
import Features from "../components/sections/Features";
import WhyEzzySync from "../components/sections/WhyEzzySync";
import Pricing from "../components/sections/Pricing";
import FAQ from "../components/sections/FAQ";
import Footer from "../components/layout/Footer";

export default function Home() {
  let rawCrmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";
  if (rawCrmUrl && !rawCrmUrl.startsWith("http://") && !rawCrmUrl.startsWith("https://")) {
    rawCrmUrl = `https://${rawCrmUrl}`;
  }
  const crmUrl = rawCrmUrl;

  const pageJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "EzzySync",
      "url": "https://www.ezzysync.com",
      "logo": "https://www.ezzysync.com/logo.png",
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "jainpayal0201@gmail.com",
        "contactType": "customer support"
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
      "description": "The #1 Travel CRM Software in India for travel agents and tour operators. Automate WhatsApp leads, generate day-wise AI itineraries in 60s, issue GST invoices, and track bookings with multi-agent dashboards.",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "240",
        "bestRating": "5",
        "worstRating": "1"
      },
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
            "name": "Solo Agent Plan",
            "price": "999",
            "priceCurrency": "INR"
          },
          {
            "@type": "Offer",
            "name": "Agency Growth Pro Plan",
            "price": "2499",
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
        <Hero crmUrl={crmUrl} />
        <Highlights />
        <Workflow />
        <WhatsAppDemo />
        <SocialProof />
        <Features />
        <WhyEzzySync />
        <Pricing crmUrl={crmUrl} />
        <FAQ />
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

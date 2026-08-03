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
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";

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
      }
    },
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

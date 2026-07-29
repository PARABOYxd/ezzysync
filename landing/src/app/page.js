import React from "react";
import Navbar from "../components/layout/Navbar";
import Hero from "../components/sections/Hero";
import Highlights from "../components/sections/Highlights";
import Workflow from "../components/sections/Workflow";
import Problem from "../components/sections/Problem";
import Features from "../components/sections/Features";
import WhyEzzySync from "../components/sections/WhyEzzySync";
import WhatsAppDemo from "../components/sections/WhatsAppDemo";
import SocialProof from "../components/sections/SocialProof";
import Pricing from "../components/sections/Pricing";
import FAQ from "../components/sections/FAQ";
import DemoForm from "../components/sections/DemoForm";
import Footer from "../components/layout/Footer";
import { faqData } from "../data/landingData";

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
    },
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
        <Problem />
        <Features />
        <WhyEzzySync />
        <WhatsAppDemo />
        <SocialProof />
        <Pricing crmUrl={crmUrl} />
        <FAQ />
        <DemoForm />
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

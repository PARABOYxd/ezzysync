import React from "react";
import Navbar from "../components/layout/Navbar";
import Hero from "../components/sections/Hero";
import Highlights from "../components/sections/Highlights";
import Workflow from "../components/sections/Workflow";
import Problem from "../components/sections/Problem";
import Features from "../components/sections/Features";
import WhatsAppDemo from "../components/sections/WhatsAppDemo";
import SocialProof from "../components/sections/SocialProof";
import Pricing from "../components/sections/Pricing";
import FAQ from "../components/sections/FAQ";
import DemoForm from "../components/sections/DemoForm";
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
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Do I need a separate WhatsApp Business API account?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, you can integrate your own Meta WhatsApp Cloud API credentials directly in the CRM Settings. We guide you step-by-step to get a free phone number ID and access token from Meta so you don't pay third-party markup fees."
          }
        },
        {
          "@type": "Question",
          "name": "Is my agency's client data secure and isolated?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Absolutely. EzzySync CRM is built on a multi-tenant PostgreSQL database structure. Each agency's data is isolated using a strict tenant filtering policy at the database query level. No agency can ever read or write another agency's data."
          }
        },
        {
          "@type": "Question",
          "name": "Can I export invoices and reports to Excel or PDF?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, you can download any invoice as a beautifully formatted PDF directly from the interface, and you can export all your bookings and financial reports to standard CSV/Excel format with a single click."
          }
        },
        {
          "@type": "Question",
          "name": "Does EzzySync support multiple agents with different permissions?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Currently, our system supports agency-wide credentials. We are rolling out multi-agent role-based permissions (Admin, Agent, Finance) in our upcoming release next month."
          }
        }
      ]
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

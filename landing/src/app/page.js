import React from "react";
import Navbar from "../components/layout/Navbar";
import Hero from "../components/sections/Hero";
import TrustStrip from "../components/sections/TrustStrip";
import Problem from "../components/sections/Problem";
import FlowDiagram from "../components/sections/FlowDiagram";
import FeatureZigZag from "../components/sections/FeatureZigZag";
import FreeItineraryTeaser from "../components/sections/FreeItineraryTeaser";
import Testimonials from "../components/sections/Testimonials";
import ComparisonMatrix from "../components/sections/ComparisonMatrix";
import Pricing from "../components/sections/Pricing";
import LiveDemoSection from "../components/sections/LiveDemoSection";
import FAQ from "../components/sections/FAQ";
import Footer from "../components/layout/Footer";
import StickyWidgets from "../components/common/StickyWidgets";
import { getCrmUrl } from "@/lib/crmUrl";
import { PLAN_PRICE_RUPEES } from "@/data/plans";
import { faqData } from "@/data/landingData";
import { TEL_PHONE, SUPPORT_EMAIL } from "@/lib/contact";

// The six objections that matter most on the homepage. The full list stays in
// landingData for the other pages; the FAQPage JSON-LD below must match what
// is actually rendered, so both read from this subset.
const HOME_FAQ_QUESTIONS = [
  "Can I import my existing Excel leads?",
  "Can multiple team members use EzzySync?",
  "Can I connect my WhatsApp Business number?",
  "Can I create quotations and itineraries?",
  "How does the trial work?",
  "Can I cancel anytime?",
];
const homeFaqs = faqData.filter((item) => HOME_FAQ_QUESTIONS.includes(item.q));

export default function Home() {
  const crmUrl = getCrmUrl();

  const pageJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": homeFaqs.map((item) => ({
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
      "telephone": TEL_PHONE,
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": TEL_PHONE,
        "email": SUPPORT_EMAIL,
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
      "description": "Travel CRM software for tour operators and travel agents in India. Capture WhatsApp leads, generate day-wise itineraries, issue GST quotations, and track bookings.",
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
        <Hero crmUrl={crmUrl} />
        <TrustStrip />
        <Problem />
        <FlowDiagram />
        <FeatureZigZag />
        <FreeItineraryTeaser />
        <Testimonials />
        <ComparisonMatrix />
        <Pricing crmUrl={crmUrl} />
        <FAQ items={homeFaqs} bgClass="bg-slate-50" />
        <LiveDemoSection crmUrl={crmUrl} />
      </main>
      <Footer crmUrl={crmUrl} />
      {/* Keeps the footer clear of the mobile sticky CTA bar */}
      <div className="md:hidden h-20 bg-slate-950" aria-hidden="true" />
      <StickyWidgets crmUrl={crmUrl} />
    </div>
  );
}

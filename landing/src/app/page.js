import React from "react";
import Navbar from "../components/layout/Navbar";
import HomeHero from "../components/home/HomeHero";
import WorksWith from "../components/home/WorksWith";
import Problem from "../components/sections/Problem";
import FeatureZigZag from "../components/sections/FeatureZigZag";
import FlowDiagram from "../components/sections/FlowDiagram";
import Stats from "../components/home/Stats";
import WhoItsFor from "../components/home/WhoItsFor";
import Testimonials from "../components/sections/Testimonials";
import ComparisonMatrix from "../components/sections/ComparisonMatrix";
import FreeItineraryTeaser from "../components/sections/FreeItineraryTeaser";
import Pricing from "../components/sections/Pricing";
import Insights from "../components/home/Insights";
import FAQ from "../components/sections/FAQ";
import LiveDemoSection from "../components/sections/LiveDemoSection";
import FinalCta from "../components/home/FinalCta";
import Footer from "../components/layout/Footer";
import StickyWidgets from "../components/common/StickyWidgets";
import { getCrmUrl } from "@/lib/crmUrl";
import { PLAN_PRICE_RUPEES } from "@/data/plans";
import { faqData } from "@/data/landingData";
import { SITE_URL } from "@/lib/siteLinks";
import { withSeo } from "@/lib/seoOverrides";

const HOME_TITLE = "Travel CRM for Travel Agencies & Tour Operators | EzzySync";
const HOME_DESCRIPTION =
  "Travel CRM for Indian agencies and tour operators: WhatsApp leads, day-wise itineraries, GST quotes and payment tracking in one place. Start a free trial.";

export const metadata = withSeo("/", {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "https://www.ezzysync.com",
    siteName: "EzzySync Travel CRM",
    locale: "en_IN",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: HOME_TITLE, description: HOME_DESCRIPTION },
});

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
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      "name": "EzzySync Travel CRM",
      "publisher": { "@id": `${SITE_URL}/#organization` },
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": SITE_URL,
      "featureList": [
        "Official Meta WhatsApp Cloud API integration",
        "Day-wise travel itinerary builder with PDF",
        "GST quotations and invoices (SAC 998555)",
        "Lead management and follow-up pipeline",
        "Hotel and driver service vouchers",
        "Razorpay milestone payment sync"
      ],
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
    <div className="min-h-screen bg-paper text-ink-900 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <Navbar crmUrl={crmUrl} />
      <main>
        <HomeHero crmUrl={crmUrl} />
        <WorksWith />
        <Problem />
        <FeatureZigZag />
        <FlowDiagram />
        <Stats />
        <WhoItsFor />
        <Testimonials />
        <ComparisonMatrix />
        <FreeItineraryTeaser />
        <Pricing crmUrl={crmUrl} />
        <Insights />
        <FAQ items={homeFaqs} />
        <LiveDemoSection crmUrl={crmUrl} />
        <FinalCta crmUrl={crmUrl} />
      </main>
      <Footer crmUrl={crmUrl} />
      {/* Keeps the footer clear of the mobile sticky CTA bar */}
      <div className="md:hidden h-20 bg-ink-900" aria-hidden="true" />
      <StickyWidgets crmUrl={crmUrl} />
    </div>
  );
}

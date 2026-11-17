import React from "react";
import PageHero, { heroPrimaryClass, heroSecondaryClass } from "@/components/common/PageHero";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Pricing from "../../components/sections/Pricing";
import FAQ from "../../components/sections/FAQ";
import { faqData } from "../../data/landingData";
import { getCrmUrl } from "@/lib/crmUrl";
import { PLAN_PRICE_RUPEES } from "@/data/plans";
import { ArrowRight } from "lucide-react";
import { withSeo } from "@/lib/seoOverrides";

export const metadata = withSeo("/pricing", {
  title: "Travel CRM Pricing — EzzySync Plans & Free Tier",
  description: "EzzySync pricing: 30-day free trial with full Pro access, then a Solo Agent plan, an Agency Growth plan, or custom Enterprise pricing.",
  alternates: {
    canonical: "/pricing",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Travel CRM Pricing — EzzySync Plans & Free Tier",
    description: "EzzySync pricing: 30-day free trial with full Pro access, then a Solo Agent plan, an Agency Growth plan, or custom Enterprise pricing.",
    url: "https://www.ezzysync.com/pricing",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Travel CRM Pricing — EzzySync Plans & Free Tier",
    description: "EzzySync pricing: 30-day free trial with full Pro access, then a Solo Agent plan, an Agency Growth plan, or custom Enterprise pricing.",
  },
});

export default function PricingPage() {
  const crmUrl = getCrmUrl();
  const pricingFaqs = faqData.filter((item) => item.category === "pricing");

  const pageJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.ezzysync.com/" },
        { "@type": "ListItem", "position": 2, "name": "Pricing", "item": "https://www.ezzysync.com/pricing" }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": "https://www.ezzysync.com/#software",
      "name": "EzzySync Travel CRM",
      "publisher": { "@id": "https://www.ezzysync.com/#organization" },
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": "https://www.ezzysync.com",
      "description": "Scale your travel agency. Centralize leads, build professional itineraries, generate invoices, and automate WhatsApp updates. Start for free.",
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": "INR",
        // See the note on the home page: there is no ₹0 plan to offer.
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
            "name": "Agency Growth Plan",
            "price": PLAN_PRICE_RUPEES.PRO,
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
      "mainEntity": pricingFaqs.map((item) => ({
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
    <div className="min-h-screen bg-paper text-ink-900 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <Navbar crmUrl={crmUrl} />
      <main>
        <PageHero
          code="Fares"
          label="Pricing"
          title="Travel CRM pricing for every agency size"
          intro="Try everything free for 30 days, then pick the plan that fits your booking volume. No hidden setup fees or markup charges on any plan."
          facts={["30-day free trial", "Nothing auto-renews", "No card required"]}
          actions={
            <a href={`${crmUrl}/register`} className={heroPrimaryClass}>
              Start free trial <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </a>
          }
        />
        <Pricing crmUrl={crmUrl} />
        <FAQ items={pricingFaqs} heading="Pricing questions, answered" />
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

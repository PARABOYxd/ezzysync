import React from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Pricing from "../../components/sections/Pricing";
import FAQ from "../../components/sections/FAQ";
import { faqData } from "../../data/landingData";

export const metadata = {
  title: "Travel CRM Pricing — EzzySync Plans & Free Tier",
  description: "EzzySync pricing for travel agencies: a free Starter plan for up to 100 leads, an Agency Growth plan with a 7-day trial, and custom Enterprise pricing for large teams.",
  alternates: {
    canonical: "/pricing",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Travel CRM Pricing — EzzySync Plans & Free Tier",
    description: "EzzySync pricing for travel agencies: a free Starter plan for up to 100 leads, an Agency Growth plan with a 7-day trial, and custom Enterprise pricing for large teams.",
    url: "https://www.ezzysync.com/pricing",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Travel CRM Pricing — EzzySync Plans & Free Tier",
    description: "EzzySync pricing for travel agencies: a free Starter plan for up to 100 leads, an Agency Growth plan with a 7-day trial, and custom Enterprise pricing for large teams.",
  },
};

export default function PricingPage() {
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";
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
      "name": "EzzySync",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": "https://www.ezzysync.com/pricing",
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
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <Navbar crmUrl={crmUrl} />
      <main>
        <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 bg-white bg-grid-pattern overflow-hidden">
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-brand-100/20 filter blur-[110px] -z-10" aria-hidden="true"></div>
          
          <div className="max-w-[1100px] mx-auto px-5 sm:px-6 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
              
              {/* Left Column: Pricing Text */}
              <div className="lg:col-span-5 text-center lg:text-left space-y-6">
                <h1 className="load-in font-semibold text-slate-950 text-[clamp(2.25rem,5vw,3.5rem)] lg:text-[3.25rem] leading-[1.1] tracking-[-0.02em]" style={{ "--reveal-delay": "0ms" }}>
                  Travel CRM pricing for every agency size
                </h1>
                <p className="load-in text-slate-500 text-base sm:text-lg leading-relaxed" style={{ "--reveal-delay": "100ms" }}>
                  Start free, upgrade when your booking volume grows. No hidden setup fees or markup charges on any plan.
                </p>
                <div className="load-in flex flex-wrap justify-center lg:justify-start gap-2 pt-2" style={{ "--reveal-delay": "160ms" }}>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-brand-50 border border-brand-200 text-brand-700">7-day free trial</span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-brand-50 border border-brand-200 text-brand-700">Cancel anytime</span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-brand-50 border border-brand-200 text-brand-700">No card required</span>
                </div>
              </div>
              
              {/* Right Column: Pricing ROI / Value Unlock Mockup Card */}
              <div className="lg:col-span-7 load-in mt-8 lg:mt-0 relative" style={{ "--reveal-delay": "220ms" }}>
                <div className="absolute -inset-4 bg-brand-500/5 rounded-3xl filter blur-xl -z-10" aria-hidden="true"></div>
                
                <div className="max-w-md mx-auto p-6 rounded-2xl border border-slate-200 bg-white text-slate-800 text-left space-y-4 shadow-soft relative overflow-hidden">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent rounded-t-2xl" aria-hidden="true"></div>
                  
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Efficiency Index</span>
                    <span className="text-[10px] font-bold text-brand-600">Value Unleashed</span>
                  </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                        <span className="text-[18px]">🕒</span>
                        <div className="mt-3">
                          <p className="text-lg font-bold text-slate-900 leading-tight">Hours</p>
                          <p className="text-[10px] text-slate-400 font-medium">Saved each week</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                        <span className="text-[18px]">📈</span>
                        <div className="mt-3">
                          <p className="text-lg font-bold text-slate-900 leading-tight">Higher</p>
                          <p className="text-[10px] text-slate-400 font-medium">Lead Conversion</p>
                        </div>
                      </div>
                    </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">WhatsApp Cloud API</p>
                      <p className="text-[9px] text-slate-400">Zero additional markup fee</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100">Unlimited Reminders</span>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </section>
        <Pricing crmUrl={crmUrl} />
        <FAQ items={pricingFaqs} heading="Pricing questions, answered" />
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

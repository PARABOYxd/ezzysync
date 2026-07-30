import React from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Features from "../../components/sections/Features";
import WhyEzzySync from "../../components/sections/WhyEzzySync";
import FAQ from "../../components/sections/FAQ";
import { faqData } from "../../data/landingData";

export const metadata = {
  title: "Travel CRM Features — Lead Management, Itineraries & Invoicing | EzzySync",
  description: "See every EzzySync feature: lead pipeline tracking, day-wise itinerary builder, automated WhatsApp alerts, PDF invoicing, and multi-tenant data isolation for travel agencies.",
  alternates: {
    canonical: "/features",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Travel CRM Features — Lead Management, Itineraries & Invoicing | EzzySync",
    description: "See every EzzySync feature: lead pipeline tracking, day-wise itinerary builder, automated WhatsApp alerts, PDF invoicing, and multi-tenant data isolation for travel agencies.",
    url: "https://www.ezzysync.com/features",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Travel CRM Features — Lead Management, Itineraries & Invoicing | EzzySync",
    description: "See every EzzySync feature: lead pipeline tracking, day-wise itinerary builder, automated WhatsApp alerts, PDF invoicing, and multi-tenant data isolation for travel agencies.",
  },
};

export default function FeaturesPage() {
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";
  const featureFaqs = faqData.filter((item) => item.category === "feature");

  const pageJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.ezzysync.com/" },
        { "@type": "ListItem", "position": 2, "name": "Features", "item": "https://www.ezzysync.com/features" }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": featureFaqs.map((item) => ({
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
              
              {/* Left Column: Heading and Description */}
              <div className="lg:col-span-5 text-center lg:text-left space-y-6">
                <h1 className="load-in font-semibold text-slate-950 text-[clamp(2.25rem,5vw,3.5rem)] lg:text-[3.25rem] leading-[1.1] tracking-[-0.02em]" style={{ "--reveal-delay": "0ms" }}>
                  Travel CRM features built for booking management
                </h1>
                <p className="load-in text-slate-500 text-base sm:text-lg leading-relaxed" style={{ "--reveal-delay": "100ms" }}>
                  Every feature below is built around the actual travel agency workflow — lead intake, itinerary
                  building, invoicing, and client updates — instead of generic CRM tooling.
                </p>
                <div className="load-in flex flex-wrap justify-center lg:justify-start gap-2 pt-2" style={{ "--reveal-delay": "160ms" }}>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-brand-50 border border-brand-200 text-brand-700">Meta partner integration</span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-brand-50 border border-brand-200 text-brand-700">AI itinerary engine</span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-brand-50 border border-brand-200 text-brand-700">Secure tenant isolation</span>
                </div>
              </div>
              
              {/* Right Column: Creative Visual Flowchart Widget */}
              <div className="lg:col-span-7 load-in mt-8 lg:mt-0 relative" style={{ "--reveal-delay": "220ms" }}>
                <div className="absolute -inset-4 bg-brand-500/5 rounded-3xl filter blur-xl -z-10" aria-hidden="true"></div>
                
                <div className="max-w-md mx-auto space-y-3.5 relative z-10">
                  {/* Step 1 */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-soft flex items-center gap-3.5 text-left relative overflow-hidden">
                    <div className="w-8.5 h-8.5 rounded-lg bg-brand-50 flex items-center justify-center text-sm">📥</div>
                    <div className="space-y-0.5">
                      <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">1. Client Intake</div>
                      <p className="font-semibold text-slate-900 text-xs">Lead Captured: Rahul (Bali Tour)</p>
                    </div>
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">Captured</span>
                  </div>

                  {/* Connector */}
                  <div className="w-px h-6 bg-gradient-to-b from-brand-300 to-brand-500 mx-auto"></div>

                  {/* Step 2 */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-soft flex items-center gap-3.5 text-left relative overflow-hidden">
                    <div className="w-8.5 h-8.5 rounded-lg bg-emerald-50 flex items-center justify-center text-sm">✈️</div>
                    <div className="space-y-0.5">
                      <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">2. Itinerary Engine</div>
                      <p className="font-semibold text-slate-900 text-xs">Bali 5-Day Day-wise Itinerary</p>
                    </div>
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">AI Generated</span>
                  </div>

                  {/* Connector */}
                  <div className="w-px h-6 bg-gradient-to-b from-brand-300 to-brand-500 mx-auto"></div>

                  {/* Step 3 */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-soft flex items-center gap-3.5 text-left relative overflow-hidden">
                    <div className="w-8.5 h-8.5 rounded-lg bg-brand-50 flex items-center justify-center text-sm">💬</div>
                    <div className="space-y-0.5">
                      <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">3. Automation</div>
                      <p className="font-semibold text-slate-900 text-xs">WhatsApp Alert & Trip Link Sent</p>
                    </div>
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">Delivered</span>
                  </div>

                  {/* Connector */}
                  <div className="w-px h-6 bg-gradient-to-b from-brand-300 to-brand-500 mx-auto"></div>

                  {/* Step 4 */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-soft flex items-center gap-3.5 text-left relative overflow-hidden">
                    <div className="w-8.5 h-8.5 rounded-lg bg-emerald-500 flex items-center justify-center text-sm text-white font-bold">₹</div>
                    <div className="space-y-0.5">
                      <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">4. Billing</div>
                      <p className="font-semibold text-slate-900 text-xs">Booking Confirmation Receipt</p>
                    </div>
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">₹85,000 Paid</span>
                  </div>
                </div>

              </div>
              
            </div>
          </div>
        </section>
        <Features />
        <WhyEzzySync />
        <FAQ items={featureFaqs} heading="Feature questions, answered" />
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

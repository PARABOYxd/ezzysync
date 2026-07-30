import React from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import DemoForm from "../../components/sections/DemoForm";

export const metadata = {
  title: "Contact EzzySync — Book a Free Travel CRM Walkthrough",
  description: "Talk to EzzySync about your travel agency's booking workflow. Book a free product walkthrough — no credit card required, response within 24 hours.",
  alternates: {
    canonical: "/contact",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Contact EzzySync — Book a Free Travel CRM Walkthrough",
    description: "Talk to EzzySync about your travel agency's booking workflow. Book a free product walkthrough — no credit card required, response within 24 hours.",
    url: "https://www.ezzysync.com/contact",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact EzzySync — Book a Free Travel CRM Walkthrough",
    description: "Talk to EzzySync about your travel agency's booking workflow. Book a free product walkthrough — no credit card required, response within 24 hours.",
  },
};

export default function ContactPage() {
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.ezzysync.com/" },
      { "@type": "ListItem", "position": 2, "name": "Contact", "item": "https://www.ezzysync.com/contact" }
    ]
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <Navbar crmUrl={crmUrl} />
      <main>
        <section className="relative pt-24 pb-12 sm:pt-32 sm:pb-16 bg-white bg-grid-pattern overflow-hidden">
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[320px] h-[320px] rounded-full bg-brand-100/40 filter blur-[90px] -z-10" aria-hidden="true"></div>
          <div className="max-w-[46rem] mx-auto px-5 sm:px-6 text-center space-y-6">
            <h1 className="load-in font-semibold text-slate-950 text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.1] tracking-[-0.02em]" style={{ "--reveal-delay": "0ms" }}>
              Talk to EzzySync
            </h1>
            <p className="load-in text-slate-500 text-base sm:text-lg leading-relaxed max-w-[50ch] mx-auto" style={{ "--reveal-delay": "100ms" }}>
              Book a free walkthrough and we'll show you how EzzySync fits your agency's booking workflow.
            </p>
          </div>
        </section>
        <DemoForm />
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <Navbar crmUrl={crmUrl} />
      <main>
        <section className="pt-14 pb-4 sm:pt-20 bg-gradient-to-b from-slate-50 via-white to-slate-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              Talk to EzzySync
            </h1>
            <p className="text-slate-600 text-sm sm:text-lg max-w-2xl mx-auto">
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

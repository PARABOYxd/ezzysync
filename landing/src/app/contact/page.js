import React from "react";
import PageHero, { heroPrimaryClass, heroSecondaryClass } from "@/components/common/PageHero";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import DemoForm from "../../components/sections/DemoForm";
import { getCrmUrl } from "@/lib/crmUrl";
import { ClipboardList, Calendar, KeyRound } from "lucide-react";
import { withSeo } from "@/lib/seoOverrides";

export const metadata = withSeo("/contact", {
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
});

export default function ContactPage() {
  const crmUrl = getCrmUrl();

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.ezzysync.com/" },
      { "@type": "ListItem", "position": 2, "name": "Contact", "item": "https://www.ezzysync.com/contact" }
    ]
  };

  return (
    <div className="min-h-screen bg-paper text-ink-900 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <Navbar crmUrl={crmUrl} />
      <main>
        <PageHero
          code="Help desk"
          label="Contact sales"
          title="Talk to EzzySync"
          intro="Book a free walkthrough and we'll show you how EzzySync fits your agency's booking workflow. Let's configure your isolated workspace together."
          facts={["Response within 24 hours", "1-on-1 walkthrough"]}
          aside={
            <div>
              <p className="t-label text-ink-600">What happens next</p>
              <ol className="mt-6 border-t border-ink-900">
                {[
                  [ClipboardList, "Submit the walkthrough form below", "1 min"],
                  [Calendar, "Schedule a slot for your live demo", "Pick a date"],
                  [KeyRound, "Get your own sandbox workspace", "Instant"],
                ].map(([Icon, text, tag], i) => (
                  <li key={text} className="flex items-center gap-4 py-5 border-b border-line">
                    <span className="t-label text-ink-600 w-6 tabular-nums">0{i + 1}</span>
                    <Icon className="w-5 h-5 text-ink-900 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                    <span className="flex-1 text-[16px] text-ink-900">{text}</span>
                    <span className="text-[13px] text-ink-600">{tag}</span>
                  </li>
                ))}
              </ol>
            </div>
          }
        />
        <DemoForm />
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

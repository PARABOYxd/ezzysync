import React from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import FAQ from "../../components/sections/FAQ";
import { faqData } from "../../data/landingData";
import { getCrmUrl, getTrialUrl } from "@/lib/crmUrl";
import { TEL_PHONE, DISPLAY_PHONE, SUPPORT_EMAIL, SUPPORT_HOURS, waLink, WA_ABOUT_INQUIRY_TEXT, WA_WALKTHROUGH_TEXT } from "@/lib/contact";
import {
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  CheckCircle2,
  Clock,
  Receipt,
  Users,
  Compass,
  MapPin,
  Mail,
  PhoneCall,
} from "lucide-react";
import WhatsAppIcon from "../../components/common/WhatsAppIcon";
import { withSeo } from "@/lib/seoOverrides";

export const metadata = withSeo("/about", {
  title: "About EzzySync — Travel CRM Built in India",
  description: "EzzySync was built to help Indian travel agents replace scattered WhatsApp chats, Word quotation files, and Excel sheets with one reliable booking workflow.",
  alternates: {
    canonical: "/about",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "About EzzySync — Travel CRM Built in India",
    description: "EzzySync was built to help Indian travel agents replace scattered WhatsApp chats, Word quotation files, and Excel sheets with one reliable booking workflow.",
    url: "https://www.ezzysync.com/about",
    siteName: "EzzySync Travel CRM",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About EzzySync — Travel CRM Built in India",
    description: "EzzySync was built to help Indian travel agents replace scattered WhatsApp chats, Word quotation files, and Excel sheets with one reliable booking workflow.",
  },
});

export default function AboutPage() {
  const crmUrl = getCrmUrl();
  const trialUrl = getTrialUrl(crmUrl);
  const generalFaqs = faqData.filter((item) => item.category === "general" || item.category === "feature");

  const pageJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.ezzysync.com/" },
        { "@type": "ListItem", position: 2, name: "About", item: "https://www.ezzysync.com/about" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "EzzySync Travel CRM",
      url: "https://www.ezzysync.com",
      logo: "https://www.ezzysync.com/logo.png",
      description: "Dedicated Travel CRM for Tour Operators and Travel Agencies in India.",
      telephone: TEL_PHONE,
      address: {
        "@type": "PostalAddress",
        addressLocality: "New Delhi",
        addressCountry: "IN",
      },
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <Navbar crmUrl={crmUrl} />

      <main>
        {/* Hero Section */}
        <section className="pt-14 pb-16 sm:pt-20 sm:pb-24 bg-[#fafbfc] border-b border-slate-200">
          <div className="max-w-[1140px] mx-auto px-5 sm:px-6 text-center space-y-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
              About EzzySync
            </span>

            <h1 className="font-bold text-slate-950 text-3xl sm:text-5xl lg:text-[3.2rem] leading-[1.15] tracking-tight max-w-4xl mx-auto">
              Built specifically for Indian tour operators &amp; travel agencies
            </h1>

            <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              We started EzzySync with one straightforward goal: replace messy Excel files, personal WhatsApp chaos,
              and generic foreign CRMs with simple, fast software designed for how Indian travel businesses actually operate.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
              <a
                href={trialUrl}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 btn-press"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={waLink(WA_ABOUT_INQUIRY_TEXT)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm transition-all flex items-center justify-center gap-2 btn-press"
              >
                <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                <span>Chat with our team</span>
              </a>
            </div>
          </div>
        </section>

        {/* Why EzzySync Exists */}
        <section className="py-16 sm:py-24 bg-white border-b border-slate-200">
          <div className="max-w-[1000px] mx-auto px-5 sm:px-6 space-y-12">
            <div className="space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
                The Problem We Saw
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight">
                Why standard business software fails travel planners
              </h2>
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                Most general CRM platforms like Zoho or HubSpot were designed for IT companies or corporate B2B sales.
                They don’t understand how travel works in India:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Quotes take too long</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Every small customer change means re-editing Word documents, re-calculating per-person pricing,
                  and typing hotel terms again from scratch.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Leads get lost on staff phones</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Inquiries come in across WhatsApp, Instagram ads, and phone calls. Without one central team inbox,
                  nobody knows who followed up and bookings slip away.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Payment tracking is messy</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Clients pay in milestones — advance, second installment, and final balance. Scrolling through WhatsApp
                  for UPI screenshots leaves accounting confused.
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8 bg-brand-50/60 rounded-2xl border border-brand-200 text-slate-900 space-y-2">
              <div className="font-bold text-base sm:text-lg text-slate-950">
                EzzySync handles the entire journey in one place
              </div>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                From the first WhatsApp ping to the day-wise itinerary, branded GST quotation (SAC 998555),
                payment advance ledger, and hotel vouchers — your team works out of a single clear dashboard.
              </p>
            </div>
          </div>
        </section>

        {/* Our Core Commitments */}
        <section className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200">
          <div className="max-w-[1000px] mx-auto px-5 sm:px-6 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
                How We Operate
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight">
                Our commitments to every travel agency
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <h3 className="font-bold text-base text-slate-900">Official Meta WhatsApp API</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  We only connect through the official Meta Cloud API. We do not use unauthorized scraping extensions
                  or unverified web-WhatsApp bots that risk getting your business number banned.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <h3 className="font-bold text-base text-slate-900">Your Data Is Strictly Yours</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your traveler customer list, supplier costs, and quotes are confidential business assets.
                  We never share, sell, or cross-target client data under any circumstances.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <FileCheck className="w-5 h-5" />
                  </span>
                  <h3 className="font-bold text-base text-slate-900">Built for Indian Regulations</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  GST SAC 998555 calculation, rupee formatting (₹), and Razorpay payments are natively supported.
                  You don’t have to customize a US dollar tool for Indian tax rules.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                    <PhoneCall className="w-5 h-5" />
                  </span>
                  <h3 className="font-bold text-base text-slate-900">Direct Human Support</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  If you or your team have a question during setup, you can reach out directly on WhatsApp or phone
                  to a real team member in India — no automated bot loops.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact and Office Details */}
        <section className="py-16 sm:py-24 bg-white border-b border-slate-200">
          <div className="max-w-[1000px] mx-auto px-5 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
                  Get in Touch
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
                  Direct team support from New Delhi
                </h3>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Whether you want help migrating existing leads from Excel or want a quick walkthrough
                  of how quotations work, we’re happy to assist.
                </p>
                <div className="space-y-2.5 text-sm text-slate-700 pt-2">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>Headquarters: New Delhi, India</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <WhatsAppIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>WhatsApp: {DISPLAY_PHONE}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>Email: {SUPPORT_EMAIL}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Hours: {SUPPORT_HOURS}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-3xl border border-slate-200 p-7 sm:p-8 space-y-4 text-center sm:text-left">
                <h4 className="font-bold text-slate-950 text-lg">Schedule a 15-Minute Live Demo</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  See how EzzySync handles real inquiry-to-voucher workflows with your agency’s destinations.
                </p>
                <a
                  href={waLink(WA_WALKTHROUGH_TEXT)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-all btn-press"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>Book Demo on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <FAQ items={generalFaqs} heading="Frequently Asked Questions" />
      </main>

      <Footer crmUrl={crmUrl} />
    </div>
  );
}

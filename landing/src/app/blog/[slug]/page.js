"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const articlesData = {
  "whatsapp-marketing-for-travel-agents": {
    title: "Why Travel Agents Lose 40% of Bookings in Scattered WhatsApp Chats",
    date: "July 28, 2026",
    readTime: "5 min read",
    category: "Operations",
    image: "/blog_whatsapp.jpg",
    content: (
      <>
        <p className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7] mb-6">In the modern travel industry, speed and relationship-building are everything. But for many agencies, the primary channel of communication—personal WhatsApp chats—is also the single biggest source of lost revenue.</p>
        
        <h2 className="text-slate-900 font-bold mt-10 mb-4 text-[20px] tracking-tight">The Danger of Scattered Chat Histories</h2>
        <p className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7] mb-6">When customer inquiries, destination preferences, and payment receipts are scattered across individual agents' personal phones, several critical problems occur:</p>
        <ul className="space-y-3 pl-5 border-l-2 border-brand-500/80 mb-6">
          <li className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7]"><strong>Zero Oversight:</strong> Agency owners cannot track response times, chat history quality, or pending client follow-ups.</li>
          <li className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7]"><strong>Leads Lost on Staff Exit:</strong> If an agent leaves the company, they take your customer database and communication logs with them.</li>
          <li className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7]"><strong>Manual Copy-Paste Errors:</strong> Copying customer data from WhatsApp into Word documents for itineraries and invoices leads to billing inaccuracies and booking delays.</li>
        </ul>

        <h2 className="text-slate-900 font-bold mt-10 mb-4 text-[20px] tracking-tight">The Solution: Centralized CRM Database</h2>
        <p className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7]">By connecting your operations to a travel CRM like EzzySync that integrates directly with the Meta WhatsApp Cloud API, you establish a centralized lead pipeline. Inquiries are automatically logged, follow-ups are scheduled systematically, and client communication remains secure within your business portal.</p>
      </>
    )
  },
  "streamline-travel-agency-billing": {
    title: "The Travel Agency Guide to Secure Billing and Isolated Invoicing",
    date: "July 25, 2026",
    readTime: "4 min read",
    category: "Security",
    image: "/blog_billing.jpg",
    content: (
      <>
        <p className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7] mb-6">Billing is the engine of your agency, yet invoicing is frequently managed using unsecure, manual methods like Word templates or spreadsheet formulas.</p>
        
        <h2 className="text-slate-900 font-bold mt-10 mb-4 text-[20px] tracking-tight">Risks of Manual Invoicing Methods</h2>
        <p className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7] mb-6">Manual invoicing exposes your travel business to significant operational and legal risks:</p>
        <ul className="space-y-3 pl-5 border-l-2 border-brand-500/80 mb-6">
          <li className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7]"><strong>Data Leakage:</strong> Shared folders or generic CRMs without tenant-isolation parameters risk cross-agency data exposure.</li>
          <li className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7]"><strong>Auditing Delays:</strong> Without dynamic, single-click billing systems, reconciling deposits, GDS flight ticket numbers, and tour payments takes hours.</li>
          <li className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7]"><strong>Lack of Professionalism:</strong> Inconsistent PDF layouts and missing secure isolated database receipt numbers degrade customer trust.</li>
        </ul>

        <h2 className="text-slate-900 font-bold mt-10 mb-4 text-[20px] tracking-tight">How Isolated Multi-Tenancy Solves Security</h2>
        <p className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7]">A true multi-tenant travel CRM guarantees that each agency's billing records are encrypted and isolated at the database level. EzzySync implements absolute tenant isolation, ensuring your agency's invoices, booking volumes, and client details are completely invisible to other agencies on the platform.</p>
      </>
    )
  },
  "ai-itinerary-builder-efficiency": {
    title: "How to Build Custom Day-Wise Itineraries in Seconds Using AI",
    date: "July 20, 2026",
    readTime: "6 min read",
    category: "Technology",
    image: "/blog_itinerary.jpg",
    content: (
      <>
        <p className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7] mb-6">Building travel itineraries is historically one of the most time-consuming tasks for travel agents. Copying hotel details, flight schedules, and sightseeing summaries from search engines to document templates takes hours.</p>
        
        <h2 className="text-slate-900 font-bold mt-10 mb-4 text-[20px] tracking-tight">How AI Automates Itinerary Building</h2>
        <p className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7] mb-6">Modern AI itinerary builders completely redesign this workflow:</p>
        <ul className="space-y-3 pl-5 border-l-2 border-brand-500/80 mb-6">
          <li className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7]"><strong>Instant Day-Wise Mapping:</strong> Enter the destination and trip duration, and the AI drafts a complete, logical day-wise travel plan in seconds.</li>
          <li className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7]"><strong>Integrated Visual Cards:</strong> Sightseeing destinations, hotel ratings, and transportation routes are dynamically rendered as beautiful visual cards.</li>
          <li className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7]"><strong>WhatsApp Delivery:</strong> The completed itinerary is instantly shared as a responsive web link or PDF directly to the client's WhatsApp, reducing friction.</li>
        </ul>

        <h2 className="text-slate-900 font-bold mt-10 mb-4 text-[20px] tracking-tight">Keeping the Human Touch</h2>
        <p className="text-[15px] sm:text-[16px] text-slate-600 leading-[1.7]">AI does not replace the travel agent; it empowers them. With EzzySync, the generated itineraries are fully editable, allowing you to fine-tune hotel selections, adjust flight times, and add custom agency margins before client delivery.</p>
      </>
    )
  }
};

export default function BlogPostPage({ params }) {
  const { slug } = React.use(params);
  const article = articlesData[slug];
  const crmUrl = "https://www.ezzysync.com/app";

  if (!article) {
    return (
      <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col justify-between">
        <Navbar crmUrl={crmUrl} />
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">Article not found</h1>
          <Link href="/blog" className="text-brand-600 font-semibold hover:underline mt-4 inline-block">Back to Blog</Link>
        </div>
        <Footer crmUrl={crmUrl} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      <Navbar crmUrl={crmUrl} />
      
      <main className="relative pt-24 pb-20 sm:pt-32 bg-white bg-grid-pattern overflow-hidden">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-brand-100/20 filter blur-[110px] -z-10" aria-hidden="true"></div>
        
        <div className="max-w-[700px] mx-auto px-5 sm:px-6 relative z-10 space-y-8">
          <Link href="/blog" className="text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-wider flex items-center gap-1.5 transition-colors">
            <span>&larr;</span>
            <span>Back to Insights</span>
          </Link>

          {/* Article Header */}
          <div className="space-y-4 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-100">{article.category}</span>
              <span className="text-slate-400">{article.date}</span>
              <span className="text-slate-300">&bull;</span>
              <span className="text-slate-400">{article.readTime}</span>
            </div>
            <h1 className="font-semibold text-slate-950 text-2xl sm:text-3xl tracking-[-0.02em] leading-tight">
              {article.title}
            </h1>
          </div>

          {/* Article Banner Cover Image */}
          <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
            <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
          </div>

          {/* Article Body */}
          <div className="mt-8">
            {article.content}
          </div>
        </div>
      </main>

      <Footer crmUrl={crmUrl} />
    </div>
  );
}

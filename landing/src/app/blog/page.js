"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Real-world, trending travel agency tech articles with high SEO query match
const blogPosts = [
  {
    slug: "whatsapp-marketing-for-travel-agents",
    title: "Why Travel Agents Lose 40% of Bookings in Scattered WhatsApp Chats",
    excerpt: "Discover how relying on personal WhatsApp chats for lead follow-ups limits your growth and how centralizing your customer database recovers lost inquiries.",
    date: "July 28, 2026",
    readTime: "5 min read",
    category: "Operations"
  },
  {
    slug: "streamline-travel-agency-billing",
    title: "The Travel Agency Guide to Secure Billing and Isolated Invoicing",
    excerpt: "Manual PDF invoices and Word templates expose customer transaction logs. Learn how tenant-isolated database invoicing protects your financial records.",
    date: "July 25, 2026",
    readTime: "4 min read",
    category: "Security"
  },
  {
    slug: "ai-itinerary-builder-efficiency",
    title: "How to Build Custom Day-Wise Itineraries in Seconds Using AI",
    excerpt: "Stop wasting hours copy-pasting sightseeing details. See how modern AI itinerary builders automate travel routes while keeping plans customizable.",
    date: "July 20, 2026",
    readTime: "6 min read",
    category: "Technology"
  }
];

export default function BlogDashboard() {
  const crmUrl = "https://www.ezzysync.com/app";

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      <Navbar crmUrl={crmUrl} />
      
      <main className="relative pt-24 pb-20 sm:pt-32 bg-white bg-grid-pattern overflow-hidden">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-brand-100/20 filter blur-[110px] -z-10" aria-hidden="true"></div>
        
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 relative z-10 space-y-16">
          {/* Header */}
          <div className="max-w-[46rem] mx-auto text-center space-y-6">
            <h1 className="load-in font-semibold text-slate-950 text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.1] tracking-[-0.02em]" style={{ "--reveal-delay": "0ms" }}>
              EzzySync Blog & Industry Insights
            </h1>
            <p className="load-in text-slate-500 text-base sm:text-lg leading-relaxed max-w-[50ch] mx-auto" style={{ "--reveal-delay": "100ms" }}>
              Proven guides, strategies, and tutorials to help travel agencies automate billing, design itineraries, and scale WhatsApp operations.
            </p>
          </div>

          {/* Grid List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
            {blogPosts.map((post, idx) => (
              <article 
                key={post.slug} 
                className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6 flex flex-col justify-between hover:border-brand-500 transition-colors duration-300 load-in"
                style={{ "--reveal-delay": `${150 + idx * 80}ms` }}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span className="uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-100">{post.category}</span>
                    <span>{post.readTime}</span>
                  </div>
                  
                  <h2 className="font-semibold text-lg text-slate-950 tracking-tight leading-snug">
                    <Link href={`/blog/${post.slug}`} className="hover:text-brand-600 transition-colors">
                      {post.title}
                    </Link>
                  </h2>
                  
                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between mt-6">
                  <span className="text-[11px] text-slate-400 font-medium">{post.date}</span>
                  <Link href={`/blog/${post.slug}`} className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    <span>Read Article</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
      
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

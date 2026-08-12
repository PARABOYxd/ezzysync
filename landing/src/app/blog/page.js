"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Real-world, trending travel agency tech articles with high SEO query match
const blogPosts = [
  {
    slug: "festive-season-bookings-travel-agents",
    title: "How Travel Agents Can Maximize Bookings During the Festive Season",
    excerpt: "The festive season brings a massive spike in travel inquiries. Learn how to stop juggling WhatsApp chats and start automating your pipeline to maximize revenue.",
    date: "August 6, 2026",
    readTime: "7 min read",
    category: "Operations",
    thumbnail: (
      <div className="w-full h-full bg-slate-50 relative p-4 flex flex-col justify-between overflow-hidden">
        {/* Festive CRM Board Mockup */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-[10px] font-bold text-orange-600">Festive Pipeline</span>
          <span className="text-[8px] bg-orange-50 text-orange-600 border border-orange-100 px-1.5 py-0.5 rounded font-bold">DIWALI RUSH</span>
        </div>
        <div className="flex gap-2 py-2 w-full h-full">
          {/* Kanban Columns */}
          <div className="flex-1 bg-white border border-slate-100 rounded shadow-sm p-1.5 flex flex-col gap-1.5">
            <div className="text-[7px] font-bold text-slate-400">NEW LEADS (14)</div>
            <div className="bg-slate-50 border border-slate-100 p-1 rounded">
              <div className="w-full h-1 bg-slate-200 rounded mb-1"></div>
              <div className="w-2/3 h-1 bg-slate-200 rounded"></div>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-1 rounded">
              <div className="w-4/5 h-1 bg-slate-200 rounded mb-1"></div>
              <div className="w-1/2 h-1 bg-slate-200 rounded"></div>
            </div>
          </div>
          <div className="flex-1 bg-white border border-slate-100 rounded shadow-sm p-1.5 flex flex-col gap-1.5">
            <div className="text-[7px] font-bold text-brand-600">ITINERARY SENT (8)</div>
            <div className="bg-brand-50 border border-brand-100 p-1 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-center mb-1">
                <div className="w-1/2 h-1 bg-brand-200 rounded"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></div>
              </div>
              <div className="w-1/3 h-1 bg-brand-200 rounded"></div>
            </div>
          </div>
        </div>
        <div className="bg-orange-500 text-white rounded-lg p-2 flex items-center justify-between mt-auto z-10">
          <span className="text-[9px] font-bold">Automated Follow-ups</span>
          <span className="text-[9px] font-bold">Active ✓</span>
        </div>
        
        {/* Festive decoration (diya) */}
        <div className="absolute top-1 right-2 w-4 h-4 text-orange-500 opacity-60">
           <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c0 0-4 4-4 10 0 2.21 1.79 4 4 4s4-1.79 4-4c0-6-4-10-4-10zm0 12c-1.1 0-2-.9-2-2 0-1.5 1.5-3.5 2-5 0 0 2 2 2 5 0 1.1-.9 2-2 2z"/><path d="M22 17.5c0-1.93-1.57-3.5-3.5-3.5H5.5C3.57 14 2 15.57 2 17.5 2 19.43 3.57 21 5.5 21h13c1.93 0 3.5-1.57 3.5-3.5zM12 20c-1.38 0-2.5-1.12-2.5-2.5S10.62 15 12 15s2.5 1.12 2.5 2.5S13.38 20 12 20z"/></svg>
        </div>
      </div>
    )
  },
  {
    slug: "convert-instagram-leads-travel-agents",
    title: "How to Convert Instagram Leads into Confirmed Bookings: A 2026 Guide for Indian Travel Agents",
    excerpt: "Stop letting hot travel DMs go cold. Learn the 5-step conversion funnel to turn likes into booked trips using WhatsApp integrations and travel CRMs.",
    date: "August 2, 2026",
    readTime: "7 min read",
    category: "Marketing",
    thumbnail: (
      <div className="w-full h-full bg-slate-50 relative p-4 flex flex-col justify-between overflow-hidden">
        {/* Instagram DM mockup */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-[10px] font-bold text-rose-600">Instagram DM Inbound</span>
          <span className="text-[8px] bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5 rounded font-bold">HOT LEAD</span>
        </div>
        <div className="space-y-1.5 py-2">
          <div className="text-[11px] font-bold text-slate-800">Rahul Sharma</div>
          <div className="text-[9px] text-slate-500">"Price for Bali Honeymoon package please..."</div>
        </div>
        <div className="bg-[#F97316] text-white rounded-lg p-2 flex items-center justify-between">
          <span className="text-[9px] font-bold">Logged to EzzySync CRM</span>
          <span className="text-[9px] font-bold">✓ 15m Response</span>
        </div>
      </div>
    )
  },
  {
    slug: "whatsapp-marketing-for-travel-agents",
    title: "Why Travel Agents Lose Untracked Bookings in Scattered WhatsApp Chats",
    excerpt: "Discover how relying on personal WhatsApp chats for lead follow-ups limits your growth and how centralizing your customer database recovers lost inquiries.",
    date: "July 28, 2026",
    readTime: "5 min read",
    category: "Operations",
    // Render custom high-fidelity CSS thumbnail (150% real look, no AI drawings)
    thumbnail: (
      <div className="w-full h-full bg-slate-50 relative p-4 flex flex-col justify-between overflow-hidden">
        {/* Chat UI Mockup */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-600">JD</div>
          <div>
            <div className="text-[10px] font-bold text-slate-800">John Doe (Client)</div>
            <div className="text-[8px] text-slate-400">Online</div>
          </div>
        </div>
        <div className="space-y-2 py-1">
          <div className="bg-slate-200/60 text-[9px] text-slate-700 p-2 rounded-lg rounded-tl-none max-w-[80%]">
            Hey! Can you send me the quote for the Bali trip?
          </div>
          <div className="bg-brand-500 text-white text-[9px] p-2 rounded-lg rounded-tr-none max-w-[80%] self-end ml-auto">
            Sure! Generating itinerary link...
          </div>
        </div>
        {/* Lost alert box indicating why scattered chats leak value */}
        <div className="absolute top-1 right-2 bg-rose-50 border border-rose-100 px-2 py-1 rounded text-[8px] font-bold text-rose-600 flex items-center gap-1 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
          Unanswered for 14h
        </div>
      </div>
    )
  },
  {
    slug: "streamline-travel-agency-billing",
    title: "The Travel Agency Guide to Secure Billing and Isolated Invoicing",
    excerpt: "Manual PDF invoices and Word templates expose customer transaction logs. Learn how tenant-isolated database invoicing protects your financial records.",
    date: "July 25, 2026",
    readTime: "4 min read",
    category: "Security",
    thumbnail: (
      <div className="w-full h-full bg-slate-50 relative p-4 flex flex-col justify-between overflow-hidden">
        {/* Security / Billing Mockup */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="text-[9px] font-bold text-slate-400">INVOICE #EZ-8821</div>
          <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded font-bold">PAID</span>
        </div>
        <div className="space-y-1.5 py-2">
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>Agency Margin (12%)</span>
            <span className="font-bold text-slate-800">₹14,500</span>
          </div>
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>GDS Flight Charge</span>
            <span className="font-bold text-slate-800">₹88,200</span>
          </div>
        </div>
        <div className="bg-slate-900 text-white rounded-lg p-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span className="text-[9px] font-medium tracking-tight">Tenant Isolated Node</span>
          </div>
          <span className="text-[9px] font-bold text-brand-500">100% Encrypted</span>
        </div>
      </div>
    )
  },
  {
    slug: "ai-itinerary-builder-efficiency",
    title: "How to Build Custom Day-Wise Itineraries in Seconds Using AI",
    excerpt: "Stop wasting hours copy-pasting sightseeing details. See how modern AI itinerary builders automate travel routes while keeping plans customizable.",
    date: "July 20, 2026",
    readTime: "6 min read",
    category: "Technology",
    thumbnail: (
      <div className="w-full h-full bg-slate-50 relative p-4 flex flex-col justify-between overflow-hidden">
        {/* Itinerary UI Mockup */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <div className="bg-brand-50 text-brand-600 border border-brand-100 text-[9px] px-2 py-0.5 rounded font-bold">DAY 1</div>
          <div className="text-[10px] font-bold text-slate-800">Arrival in Denpasar, Bali</div>
        </div>
        <div className="space-y-2 py-2">
          <div className="flex gap-2 items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
            <div className="text-[9px] text-slate-600">14:00 - Private pickup from DPS airport</div>
          </div>
          <div className="flex gap-2 items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
            <div className="text-[9px] text-slate-600">16:30 - Check-in at Seminyak Ocean Resort</div>
          </div>
        </div>
        <div className="bg-brand-50 border border-brand-100 rounded-lg p-2 flex items-center justify-between text-[9px] text-brand-700">
          <div className="flex items-center gap-1.5 font-bold">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13"/><path d="M22 2L15 21L11 13L3 9L22 2Z"/></svg>
            <span>Auto Itinerary Generated</span>
          </div>
          <span className="font-bold text-brand-600">Saved 4 Hours</span>
        </div>
      </div>
    )
  },
  {
    slug: "agentic-ai-travel-agency-operations",
    title: "Beyond Chatbots: How Agentic AI is Automating Travel Agency Operations in 2026",
    excerpt: "Basic chatbots are dead. Learn how autonomous AI agents are taking over travel itinerary creation, price monitoring, and multi-step customer follow-ups.",
    date: "August 12, 2026",
    readTime: "6 min read",
    category: "Technology",
    thumbnail: (
      <div className="w-full h-full bg-slate-50 relative p-4 flex flex-col justify-between overflow-hidden">
        {/* Agentic AI Operations Board */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-[10px] font-bold text-indigo-600">Agentic AI Engine</span>
          <span className="text-[8px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded font-bold">AUTONOMOUS</span>
        </div>
        <div className="space-y-1.5 py-2">
          <div className="bg-white border border-slate-100 p-2 rounded shadow-sm flex items-center justify-between">
            <span className="text-[9px] text-slate-700 font-medium">Drafting Bali Itinerary</span>
            <span className="text-[8px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded">✓ Ready</span>
          </div>
          <div className="bg-white border border-slate-100 p-2 rounded shadow-sm flex items-center justify-between">
            <span className="text-[9px] text-slate-700 font-medium">Comparing flight margins</span>
            <span className="text-[8px] text-amber-600 font-bold bg-amber-50 px-1 rounded animate-pulse">Running...</span>
          </div>
        </div>
        <div className="bg-indigo-600 text-white rounded-lg p-2 flex items-center justify-between mt-auto z-10">
          <span className="text-[9px] font-bold">24/7 Virtual Operations Agent</span>
          <span className="text-[9px] font-bold">Active ✓</span>
        </div>
      </div>
    )
  }
];

export default function BlogDashboard() {
  let rawCrmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";
  if (rawCrmUrl && !rawCrmUrl.startsWith("http://") && !rawCrmUrl.startsWith("https://")) {
    rawCrmUrl = `https://${rawCrmUrl}`;
  }
  const crmUrl = rawCrmUrl;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      <Navbar crmUrl={crmUrl} />
      <main className="relative overflow-hidden">
        {/* Banner Hero Section */}
        <section className="bg-slate-50 border-b border-slate-200/80 pt-24 pb-16 sm:pt-32 sm:pb-24 relative overflow-hidden">
          {/* Subtle Grid Backdrop */}
          <div className="absolute inset-0 bg-grid-pattern opacity-4 pointer-events-none"></div>
          {/* Blur Glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-brand-500/10 filter blur-[90px] pointer-events-none"></div>
          
          <div className="max-w-[700px] mx-auto px-5 sm:px-6 relative z-10 text-center space-y-6 flex flex-col items-center justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 border border-brand-100">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600"></span>
              Travel Agency Insights
            </span>
            <h1 className="font-bold text-[clamp(2.25rem,5vw,3.25rem)] leading-[1.1] tracking-[-0.03em] text-slate-950">
              Mastering CRM Security &amp; Booking Automation
            </h1>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-[55ch] mx-auto">
              Explore high-impact guides, operations blueprints, and tutorials built to scale travel networks, auto-schedule itineraries, and secure financial data logs.
            </p>
          </div>
        </section>

        {/* Blog Posts Grid Section */}
        <section className="max-w-[1100px] mx-auto px-5 sm:px-6 py-16 relative z-10 space-y-12">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="font-bold text-2xl text-slate-950 tracking-tight">Recent Industry Guides</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {blogPosts.map((post, idx) => (
              <article 
                key={post.slug} 
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between hover:border-brand-500 hover:shadow-soft transition-all duration-300 group"
              >
                <div>
                  {/* Thumbnail area containing our real CSS mockup widgets instead of AI art */}
                  <div className="h-48 border-b border-slate-200 bg-slate-50 overflow-hidden relative">
                    {post.thumbnail}
                  </div>
                  
                  {/* Article details */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span className="uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-100">{post.category}</span>
                      <span>{post.readTime}</span>
                    </div>
                    
                    <h3 className="font-bold text-base text-slate-950 tracking-tight leading-snug group-hover:text-brand-600 transition-colors">
                      <Link href={`/blog/${post.slug}`}>
                        {post.title}
                      </Link>
                    </h3>
                    
                    <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0 mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">{post.date}</span>
                  <Link href={`/blog/${post.slug}`} className="text-xs font-bold text-brand-600 group-hover:text-brand-700 flex items-center gap-1">
                    <span>Read Article</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

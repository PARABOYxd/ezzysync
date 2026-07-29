"use client";
import React from "react";
import {
  PlaneTakeoff,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  TrendingUp,
  Bell,
  ChevronDown,
  Users,
  FileText,
  MessageSquare
} from "lucide-react";

export default function Hero({ crmUrl }) {
  return (
    <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-32 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100">
      
      {/* Custom Keyframe & 3D Tilt Animations CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(8px) rotate(-1deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.03); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-reverse-slow {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        .perspective-3d {
          perspective: 2000px;
        }
        .tilted-card {
          transform: rotateY(-12deg) rotateX(6deg) rotateZ(-2deg);
          box-shadow: -20px 20px 50px rgba(15, 23, 42, 0.15), 
                      -1px 1px 0px rgba(255, 255, 255, 0.1) inset;
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s ease;
        }
        .tilted-card:hover {
          transform: rotateY(-6deg) rotateX(3deg) rotateZ(-1deg) translateY(-4px);
          box-shadow: -10px 10px 30px rgba(15, 23, 42, 0.1), 
                      -1px 1px 0px rgba(255, 255, 255, 0.15) inset;
        }
        .animate-float-slow {
          animation: float-slow 7s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 9s ease-in-out infinite;
        }
        .animate-pulse-glow {
          animation: pulse-glow 4s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 28s linear infinite;
        }
        .animate-spin-reverse-slow {
          animation: spin-reverse-slow 32s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .tilted-card, .tilted-card:hover {
            transform: none !important;
            box-shadow: none !important;
            transition: none !important;
          }
          .animate-float-slow,
          .animate-float-medium,
          .animate-pulse-glow,
          .animate-spin-slow,
          .animate-spin-reverse-slow {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}} />

      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)] opacity-[0.15]"></div>
      
      {/* Glowing Mesh Gradients */}
      <div className="absolute top-10 right-1/4 w-[450px] h-[450px] rounded-full bg-brand-300/20 filter blur-[90px] animate-pulse-glow -z-10"></div>
      <div className="absolute bottom-20 left-10 w-[280px] h-[280px] rounded-full bg-amber-250/20 filter blur-[80px] -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Split Grid Layout (Desktop Left Content, Right Product Showcase) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Heading & Value Prop */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-7 text-center lg:text-left">
            
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08]">
              The Travel CRM <br className="hidden sm:inline lg:hidden" />
              Built for <br className="hidden lg:inline" />
              <span className="relative inline-block mt-2">
                <span className="relative z-10 bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 bg-clip-text text-transparent">
                  Travel Agencies.
                </span>
                <span className="absolute bottom-1.5 left-0 right-0 h-3 bg-brand-100/60 -z-10 rounded-full"></span>
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Stop losing clients in scattered chats. Centralize leads, build professional day-wise itineraries, send PDF invoices, and automate alerts via WhatsApp.
            </p>

            {/* GEO/AEO Answer-First Citation Paragraph (Screen-Reader Only for clean layout, fully indexable by search engines & AI bots) */}
            <div className="sr-only">
              <strong>About JourneyFlow CRM:</strong> JourneyFlow is a comprehensive travel agency CRM software built for tour operators and agents. It streamlines client operations through three core capabilities: lead pipeline tracking, instant day-wise itinerary planning, and automated WhatsApp Cloud API confirmations.
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-3.5 pt-2">
              <a
                href="#demo"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-semibold shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/35 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                <span>Book Free Walkthrough</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" focusable="false" />
              </a>
              <a
                href={`${crmUrl}/login`}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-md shadow-slate-900/10 hover:shadow-lg transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <span>Start Free Trial</span>
              </a>
            </div>

            {/* Subtle trust signals */}
            <div className="pt-6 border-t border-slate-200/60 flex items-center justify-center lg:justify-start gap-8 text-xs text-slate-400 font-semibold select-none">
              <div>
                <span className="block text-lg font-bold text-slate-850">100%</span>
                <span>Tenant Isolation</span>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div>
                <span className="block text-lg font-bold text-slate-850">Official</span>
                <span>Meta API Partner</span>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive 3D Perspective Browser Frame */}
          <div className="lg:col-span-7 relative perspective-3d flex justify-center items-center pt-6 lg:pt-0">
            
            {/* Dashboard Container Mockup Frame */}
            <div className="w-full max-w-[620px] bg-slate-900 rounded-2xl shadow-2xl shadow-slate-900/40 border border-slate-800/90 p-2 sm:p-3 overflow-x-auto lg:overflow-hidden relative z-10 lg:tilted-card">
              <div className="min-w-[760px] lg:min-w-0">
                
                {/* Simulated window header buttons */}
                <div className="flex items-center justify-between pb-2 px-1 border-b border-slate-850">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                  </div>
                  <div className="px-5 py-0.5 rounded bg-slate-800/50 text-slate-400 text-[9px] font-mono select-none">
                    app.journeyflowcrm.com/dashboard
                  </div>
                  <div className="w-10"></div>
                </div>

                {/* Dashboard Frame Content */}
                <div className="grid grid-cols-5 bg-slate-950/40 text-slate-300 min-h-[400px] rounded-b-xl overflow-hidden font-sans text-xs">
                  
                  {/* Sidebar navigation */}
                  <aside className="col-span-1 bg-slate-900/80 border-r border-slate-800/80 p-3 flex flex-col gap-4">
                    <div className="flex items-center gap-2 px-1 mb-2">
                      <div className="w-6 h-6 rounded bg-brand-500 flex items-center justify-center text-white font-bold">J</div>
                      <span className="font-bold tracking-tight text-white">JourneyFlow</span>
                    </div>
                    <nav className="space-y-1">
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-brand-600/10 text-brand-400 rounded-lg font-medium cursor-pointer">
                        <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Dashboard</span>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer transition-colors">
                        <Users className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Leads</span>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer transition-colors">
                        <PlaneTakeoff className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Bookings</span>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer transition-colors">
                        <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Invoices</span>
                      </div>
                    </nav>
                  </aside>

                  {/* Main Panel Content Area */}
                  <main className="col-span-4 p-4 space-y-4 bg-slate-900/30">
                    {/* Header elements inside mockup */}
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg w-48 border border-slate-800">
                        <div className="w-3 h-3 rounded-full border border-slate-500"></div>
                        <span className="text-[10px] text-slate-500">Search bookings...</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Bell className="w-4.5 h-4.5 text-slate-400 cursor-pointer hover:text-slate-200" aria-hidden="true" />
                        <div className="flex items-center gap-1.5 bg-slate-800/60 py-1 px-2 rounded-lg border border-slate-800 cursor-pointer">
                          <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white">A</div>
                          <span className="font-medium text-[10px] text-slate-200">Admin</span>
                          <ChevronDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
                        </div>
                      </div>
                    </div>

                    {/* Dashboard Stats Row */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                        <div className="flex justify-between items-center text-slate-500 mb-1">
                          <span>Total Bookings</span>
                          <ClipboardList className="w-3.5 h-3.5 text-brand-500" aria-hidden="true" />
                        </div>
                        <div className="text-base sm:text-lg font-bold text-white">48</div>
                      </div>
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                        <div className="flex justify-between items-center text-slate-500 mb-1">
                          <span>Upcoming Trips</span>
                          <PlaneTakeoff className="w-3.5 h-3.5 text-brand-500" aria-hidden="true" />
                        </div>
                        <div className="text-base sm:text-lg font-bold text-white">12</div>
                      </div>
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                        <div className="flex justify-between items-center text-slate-500 mb-1">
                          <span>Completed Trips</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                        </div>
                        <div className="text-base sm:text-lg font-bold text-white">32</div>
                      </div>
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                        <div className="flex justify-between items-center text-slate-500 mb-1">
                          <span>Revenue Today</span>
                          <TrendingUp className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                        </div>
                        <div className="text-base sm:text-lg font-bold text-white">₹1,45,000</div>
                      </div>
                    </div>

                    {/* Split Table Layout */}
                    <div className="grid grid-cols-3 gap-4">
                      
                      {/* Recent Bookings Table */}
                      <div className="col-span-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white">Recent Bookings</span>
                          <span className="text-[10px] text-brand-500 cursor-pointer hover:underline">View All</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-500 text-[10px]">
                                <th className="pb-1.5">Client</th>
                                <th className="pb-1.5">Destination</th>
                                <th className="pb-1.5">Status</th>
                                <th className="pb-1.5">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                              <tr>
                                <td className="py-2 text-white font-medium">Rahul Sharma</td>
                                <td className="py-2">Bali Package</td>
                                <td className="py-2"><span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 font-medium">Confirmed</span></td>
                                <td className="py-2 text-white">₹85,000</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-white font-medium">Priya Patel</td>
                                <td className="py-2">Switzerland Highlights</td>
                                <td className="py-2"><span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">Completed</span></td>
                                <td className="py-2 text-white">₹2,40,000</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-white font-medium">Amit Goel</td>
                                <td className="py-2">Dubai Special</td>
                                <td className="py-2"><span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-450 font-medium">Pending</span></td>
                                <td className="py-2 text-white">₹65,000</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Upcoming departures summary */}
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                        <span className="font-semibold text-white block">Departures (7 Days)</span>
                        <div className="space-y-2">
                          <div className="p-2 rounded bg-slate-800/30 border border-slate-800 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-white">Rahul Sharma</p>
                              <p className="text-[10px] text-slate-500">Bali • 26 Jul</p>
                            </div>
                            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" aria-hidden="true"></span>
                          </div>
                          <div className="p-2 rounded bg-slate-800/35 border border-slate-800 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-white">Nisha Sen</p>
                              <p className="text-[10px] text-slate-500">Maldives • 29 Jul</p>
                            </div>
                            <span className="w-2.5 h-2.5 rounded-full bg-brand-400" aria-hidden="true"></span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </main>

                </div>

              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}

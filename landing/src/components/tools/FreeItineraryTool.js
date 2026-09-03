"use client";

import React, { useState } from "react";
import {
  Sparkles,
  MapPin,
  Calendar,
  Compass,
  Building2,
  Phone,
  Printer,
  Copy,
  Check,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { generateFreeItinerary } from "@/lib/api";

const POPULAR_DESTINATIONS = [
  { name: "Dubai", flag: "🇦🇪", days: 5 },
  { name: "Goa", flag: "🏖️", days: 4 },
  { name: "Kashmir", flag: "🏔️", days: 6 },
  { name: "Bali", flag: "🌴", days: 6 },
  { name: "Thailand", flag: "🐘", days: 5 },
  { name: "Kerala", flag: "🛶", days: 5 },
  { name: "Himachal", flag: "❄️", days: 6 },
  { name: "Maldives", flag: "🏝️", days: 4 },
  { name: "Europe", flag: "🏰", days: 8 },
  { name: "Singapore", flag: "🦁", days: 5 },
];

const TRIP_STYLES = [
  "Family Vacation",
  "Honeymoon & Romantic",
  "Friends & Group Tour",
  "Luxury & Leisure",
  "Budget Backpacker",
];

const FALLBACK_ITINERARIES = {
  dubai: (days, agency) => `
# 🇦🇪 Dubai Extravaganza ${days}D/${days - 1}N Tour Itinerary
**Prepared by:** ${agency || "EzzySync Verified Travel Partner"}
**Trip Theme:** Luxury, Sightseeing & Desert Safari

---

## Day 1: Arrival in Dubai & Marina Dhow Cruise
- **Morning:** Arrival at Dubai International Airport (DXB). Private luxury transfer to your hotel.
- **Afternoon:** Check-in, relax and unpack. Free time to explore nearby local markets.
- **Evening:** 07:00 PM pickup for the stunning Dubai Marina 5-Star Dhow Cruise with international buffet dinner, live Tanoura dance show, and skyline views.
- **Stay:** Premium 4-Star Hotel in Downtown / Bur Dubai.

## Day 2: Half-Day Dubai City Tour & Burj Khalifa (124th Floor)
- **Morning:** Guided city tour covering Dubai Museum, Jumeirah Beach, Burj Al Arab photo stop, and Atlantis The Palm.
- **Afternoon:** Visit the magnificent Dubai Mall. Watch the famous underwater aquarium tunnel.
- **Evening:** Enter Burj Khalifa at the 124th & 125th Floor Observation Deck for sunset views. Witness the Dubai Musical Fountain show.
- **Stay:** Premium 4-Star Hotel.

## Day 3: Desert Safari with Dune Bashing, BBQ Dinner & Shows
- **Morning:** Lazy morning breakfast at hotel. Free time for shopping at Meena Bazaar or Gold Souk.
- **Afternoon (03:00 PM):** 4x4 Land Cruiser pickup for Thrilling Red Dunes Desert Safari. Experience dune bashing, sandboarding & sunset photography.
- **Evening:** Arrive at the Bedouin desert camp. Enjoy camel riding, henna designing, Unlimited BBQ dinner, Belly Dance & Fire show.
- **Stay:** Premium 4-Star Hotel.

## Day 4: Miracle Garden, Global Village & Free Shopping
- **Morning:** Visit the world-famous Dubai Miracle Garden (72,000 sqm floral paradise).
- **Afternoon:** Leisure lunch and visit to Global Village showcasing pavilions from 90+ countries with street food and handicrafts.
- **Evening:** Return to hotel. Optional visit to Dubai Frame.
- **Stay:** Premium 4-Star Hotel.

${
  days >= 5
    ? `## Day 5: Souvenirs & Airport Departure
- **Morning:** Enjoy a lavish hotel breakfast. Last-minute duty-free shopping at Deira City Centre.
- **Afternoon:** Private hotel checkout and transfer to Dubai Airport with unforgettable memories!`
    : `## Day 4 (Evening): Airport Departure with Sweet Memories!`
}

---

## 🎒 Package Inclusions:
- ${days - 1} Nights Hotel Accommodation with Daily Breakfast
- Return Dubai Airport Private Transfers (DXB)
- Desert Safari in 4x4 with BBQ Buffet Dinner & Shows
- Dubai Half-Day City Tour on Sharing/Private basis
- Burj Khalifa At the Top (124th/125th floor non-prime ticket)
- Dubai Marina Dhow Cruise with Buffet Dinner
- All Tourism Dirham fees & 5% VAT included

## ❌ Package Exclusions:
- International Flight tickets
- UAE Tourist Visa + OTB fees
- Personal expenses, tips, and optional activities
`,
  goa: (days, agency) => `
# 🏖️ Sun, Sand & Sea Goa ${days}D/${days - 1}N Holiday Itinerary
**Prepared by:** ${agency || "EzzySync Verified Travel Partner"}
**Trip Theme:** Coastal Bliss, Beach Parties & Water Sports

---

## Day 1: Welcome to Sunny Goa & Beach Sunset
- **Morning:** Pick up from Goa Dabolim/Mopa Airport or Madgaon/Thivim Railway Station. Transfer to your resort.
- **Afternoon:** Check-in and relax by the swimming pool. Stroll around Calangute or Candolim Beach.
- **Evening:** Sunset cocktail at a beach shack with live music. Enjoy vibrant Goan nightlife.
- **Stay:** Beachside Resort in North Goa.

## Day 2: North Goa Forts, Water Sports & Baga Nightlife
- **Morning:** Visit Aguada Fort and Light House with panoramic views of the Arabian Sea.
- **Afternoon:** Head to Anjuna & Baga Beach. Enjoy water sports (Parasailing, Jet Ski, Banana ride).
- **Evening:** Party at iconic Tito's Lane or Club Cubana.
- **Stay:** Beachside Resort in North Goa.

## Day 3: South Goa Heritage, Churches & Mandovi River Cruise
- **Morning:** Visit Old Goa Churches: Basilica of Bom Jesus and Se Cathedral (UNESCO World Heritage).
- **Afternoon:** Visit Mangueshi Temple and a Spice Plantation with traditional Goan buffet lunch.
- **Evening:** Enjoy the 1-Hour Mandovi River Sunset Cruise with Goan folk dance and DJ music.
- **Stay:** Beachside Resort in North Goa.

## Day 4: Departure with Tan Lines and Great Memories
- **Morning:** Relish a hearty breakfast. Quick shopping for Goan feni, cashews, and spices.
- **Afternoon:** Check-out and private transfer to airport/station.
`,
};

export default function FreeItineraryTool({ crmUrl }) {
  const [destination, setDestination] = useState("Dubai");
  const [days, setDays] = useState(5);
  const [tripType, setTripType] = useState("Family Vacation");
  const [agencyName, setAgencyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!destination.trim()) return;

    setLoading(true);
    setCopied(false);

    try {
      const res = await generateFreeItinerary({
        destination,
        days,
        tripType,
        agencyName: agencyName || "Your Travel Partner",
        phone,
        email,
      });

      if (res?.itinerary && res.itinerary.trim().length > 50) {
        setItinerary(res.itinerary);
      } else {
        const key = destination.toLowerCase().includes("goa") ? "goa" : "dubai";
        setItinerary(FALLBACK_ITINERARIES[key](days, agencyName));
      }
    } catch {
      const key = destination.toLowerCase().includes("goa") ? "goa" : "dubai";
      setItinerary(FALLBACK_ITINERARIES[key](days, agencyName));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!itinerary) return;
    navigator.clipboard.writeText(itinerary);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-12">
      {/* Top Generator Card */}
      <div className="bg-white rounded-3xl border-2 border-brand-500/30 p-6 sm:p-10 shadow-2xl shadow-brand-500/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-brand-500/10 via-amber-500/5 to-transparent rounded-bl-full pointer-events-none" />

        <form onSubmit={handleGenerate} className="space-y-8 relative z-10">
          
          {/* Quick Destination Pills */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Compass size={14} className="text-brand-600" />
              Quick Select Popular Destination
            </label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_DESTINATIONS.map((d) => (
                <button
                  type="button"
                  key={d.name}
                  onClick={() => {
                    setDestination(d.name);
                    setDays(d.days);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                    destination.toLowerCase() === d.name.toLowerCase()
                      ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                  }`}
                >
                  <span>{d.flag}</span>
                  <span>{d.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Destination */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin size={14} className="text-brand-600" />
                Destination Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Dubai, Bali, Kashmir, Europe"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition font-medium text-slate-800"
              />
            </div>

            {/* Number of Days */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar size={14} className="text-brand-600" />
                Trip Duration (Days)
              </label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition font-medium text-slate-800 cursor-pointer"
              >
                <option value={3}>3 Days / 2 Nights (Quick Getaway)</option>
                <option value={4}>4 Days / 3 Nights (Standard)</option>
                <option value={5}>5 Days / 4 Nights (Popular)</option>
                <option value={6}>6 Days / 5 Nights (Comfort)</option>
                <option value={7}>7 Days / 6 Nights (1 Week)</option>
                <option value={8}>8 Days / 7 Nights</option>
                <option value={10}>10 Days / 9 Nights (Grand Tour)</option>
              </select>
            </div>

            {/* Trip Theme */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles size={14} className="text-brand-600" />
                Trip Style / Category
              </label>
              <select
                value={tripType}
                onChange={(e) => setTripType(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition font-medium text-slate-800 cursor-pointer"
              >
                {TRIP_STYLES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Agency Name */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 size={14} className="text-brand-600" />
                Your Agency Name (For PDF Branding)
              </label>
              <input
                type="text"
                placeholder="e.g. Dream Vacations Co."
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition font-medium text-slate-800"
              />
            </div>

            {/* WhatsApp Number */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Phone size={14} className="text-emerald-600" />
                WhatsApp Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition font-medium text-slate-800"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>✉️</span>
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="agent@travelagency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>100% Free Forever • No Credit Card Required • Instant PDF</span>
            </div>

            <button
              type="submit"
              disabled={loading || !destination.trim()}
              className="w-full sm:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-2xl font-extrabold text-sm shadow-xl shadow-brand-500/25 transition cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating Day-Wise AI Itinerary...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate Free Day-Wise Itinerary ➔
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Generated Itinerary Output */}
      {itinerary && (
        <div id="itinerary-preview" className="space-y-6">
          
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <div>
                <p className="font-bold text-sm text-white">
                  {destination} {days}-Day Itinerary Ready!
                </p>
                <p className="text-[11px] text-slate-400">
                  Branded for {agencyName || "Your Travel Agency"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                title="Copy formatted text to send on WhatsApp"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy for WhatsApp"}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                <Printer size={14} />
                Download / Print PDF
              </button>
            </div>
          </div>

          {/* Printable Itinerary Document Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xl print:shadow-none print:border-none print:p-0">
            
            {/* Document Header */}
            <div className="border-b-2 border-brand-500 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-brand-600">
                  Customized Travel Itinerary
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-1">
                  {destination} Tour Package
                </h2>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>📅 {days} Days / {Math.max(1, days - 1)} Nights</span>
                  <span>•</span>
                  <span>✨ {tripType}</span>
                </p>
              </div>

              <div className="sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Presented By
                </p>
                <p className="font-extrabold text-base text-brand-700">
                  {agencyName || "EzzySync Travel Partner"}
                </p>
                {phone && <p className="text-xs text-slate-600 mt-0.5">📞 {phone}</p>}
              </div>
            </div>

            {/* Markdown Content Formatted */}
            <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed space-y-4">
              {itinerary.split("\n\n").map((chunk, index) => {
                if (chunk.startsWith("# ")) {
                  return (
                    <h1 key={index} className="text-2xl font-black text-slate-900 border-b border-slate-100 pb-2">
                      {chunk.replace(/^#\s*/, "")}
                    </h1>
                  );
                }
                if (chunk.startsWith("## ")) {
                  return (
                    <div key={index} className="pt-4 border-t border-slate-100 first:border-0">
                      <h3 className="text-base font-extrabold text-brand-800 flex items-center gap-2 mb-2">
                        {chunk.replace(/^##\s*/, "")}
                      </h3>
                    </div>
                  );
                }
                if (chunk.startsWith("- ")) {
                  return (
                    <ul key={index} className="space-y-1.5 pl-4 list-disc marker:text-brand-500">
                      {chunk.split("\n").map((line, liIdx) => (
                        <li key={liIdx} className="text-slate-700 text-xs sm:text-sm">
                          {line.replace(/^-\s*/, "")}
                        </li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p key={index} className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    {chunk}
                  </p>
                );
              })}
            </div>

            {/* Document Footer */}
            <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
              <p>Generated with EzzySync Free Travel Itinerary Builder</p>
              <p>Terms & Conditions Apply • Rates Subject to Availability</p>
            </div>
          </div>

          {/* Upsell to EzzySync CRM */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl print:hidden">
            <div className="space-y-2 max-w-xl">
              <span className="text-xs font-extrabold uppercase tracking-widest bg-white/20 text-white px-3 py-1 rounded-full">
                EzzySync Travel Operating System
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Want to send WhatsApp Itineraries & GST Invoices in 1 Click?
              </h3>
              <p className="text-xs sm:text-sm text-brand-100 leading-relaxed">
                Connect your WhatsApp via QR code, auto-capture incoming leads, manage bookings, and let 24x7 AI handle customer queries.
              </p>
            </div>

            <a
              href={`${crmUrl}/register`}
              className="shrink-0 px-8 py-4 bg-white hover:bg-slate-50 text-brand-700 font-extrabold text-sm rounded-2xl shadow-xl transition transform hover:scale-105"
            >
              Start 30-Day Free Trial ➔
            </a>
          </div>

        </div>
      )}
    </div>
  );
}

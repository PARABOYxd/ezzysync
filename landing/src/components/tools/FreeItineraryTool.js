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
  CheckCircle,
  XCircle,
  Lightbulb,
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

## 🎒 Package Inclusions
- Daily Breakfast at Hotel
- Return Dubai Airport Private Transfers (DXB)
- Desert Safari in 4x4 with BBQ Buffet Dinner & Shows
- Dubai Half-Day City Tour on Sharing/Private basis
- Burj Khalifa At the Top (124th/125th floor non-prime ticket)
- Dubai Marina Dhow Cruise with Buffet Dinner
- All Tourism Dirham fees & 5% VAT included

## ❌ Package Exclusions
- International Flight tickets
- UAE Tourist Visa + OTB fees
- Personal expenses, tips, and optional activities

## 💡 Travel Specialist Tips for Dubai
- Keep dress codes in mind when visiting cultural spots and mosques.
- Always pre-book prime slots for Burj Khalifa sunset.
- Carry a light jacket as malls and indoor attractions have heavy AC.
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

---

## 🎒 Package Inclusions
- Daily Breakfast at Hotel/Resort
- Pick & Drop from Airport / Railway Station by Private AC Vehicle
- North Goa and South Goa Sightseeing tours
- 1-Hour Mandovi River Sunset Cruise Ticket
- Driver charges, toll, parking & fuel included

## ❌ Package Exclusions
- Airfare / Train Tickets
- Personal expenses, watersports, and monument entry fees
- Meals not mentioned in the inclusions

## 💡 Travel Specialist Tips for Goa
- Rent a two-wheeler only with a valid helmet and driving license.
- Try authentic Goan Fish Thali at local shacks.
`,
};

function parseItineraryText(text) {
  if (!text) return null;
  const lines = text.split("\n");
  let title = "";
  const days = [];
  const inclusions = [];
  const exclusions = [];
  const tips = [];
  let currentSection = "";
  let currentDay = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("# ")) {
      title = trimmed.replace(/^#\s*/, "");
      continue;
    }

    if (trimmed.startsWith("## Day ") || trimmed.startsWith("## DAY ")) {
      if (currentDay) days.push(currentDay);
      currentDay = {
        title: trimmed.replace(/^##\s*/, ""),
        points: [],
      };
      currentSection = "day";
      continue;
    }

    if (trimmed.toLowerCase().includes("inclusion")) {
      if (currentDay) {
        days.push(currentDay);
        currentDay = null;
      }
      currentSection = "inclusions";
      continue;
    }

    if (trimmed.toLowerCase().includes("exclusion")) {
      currentSection = "exclusions";
      continue;
    }

    if (trimmed.toLowerCase().includes("tip")) {
      currentSection = "tips";
      continue;
    }

    if (currentSection === "day" && currentDay) {
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        currentDay.points.push(trimmed.replace(/^[-*]\s*/, ""));
      } else if (!trimmed.startsWith("##")) {
        currentDay.points.push(trimmed);
      }
    } else if (currentSection === "inclusions") {
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        inclusions.push(trimmed.replace(/^[-*]\s*/, ""));
      }
    } else if (currentSection === "exclusions") {
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        exclusions.push(trimmed.replace(/^[-*]\s*/, ""));
      }
    } else if (currentSection === "tips") {
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        tips.push(trimmed.replace(/^[-*]\s*/, ""));
      }
    }
  }

  if (currentDay) days.push(currentDay);

  return { title, days, inclusions, exclusions, tips };
}

export default function FreeItineraryTool({ crmUrl }) {
  const [destination, setDestination] = useState("Dubai");
  const [days, setDays] = useState(5);
  const [tripType, setTripType] = useState("Family Vacation");
  const [agencyName, setAgencyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [rawItinerary, setRawItinerary] = useState("");
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
        setRawItinerary(res.itinerary);
      } else {
        const key = destination.toLowerCase().includes("goa") ? "goa" : "dubai";
        setRawItinerary(FALLBACK_ITINERARIES[key](days, agencyName));
      }
    } catch {
      const key = destination.toLowerCase().includes("goa") ? "goa" : "dubai";
      setRawItinerary(FALLBACK_ITINERARIES[key](days, agencyName));
    } finally {
      setLoading(false);
      setTimeout(() => {
        const el = document.getElementById("itinerary-preview-anchor");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  };

  const parsed = parseItineraryText(rawItinerary);

  const handleCopy = () => {
    if (!rawItinerary) return;
    navigator.clipboard.writeText(rawItinerary);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-12">
      {/* Top Generator Card */}
      <div id="generator-card" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xl shadow-slate-200/50 relative overflow-hidden print-hide">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-brand-500/10 via-amber-500/5 to-transparent rounded-bl-full pointer-events-none" />

        <form onSubmit={handleGenerate} className="space-y-8 relative z-10">
          
          {/* Quick Destination Pills */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Compass size={14} className="text-brand-600" />
              Popular Destinations
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
                <option value={3}>3 Days / 2 Nights</option>
                <option value={4}>4 Days / 3 Nights</option>
                <option value={5}>5 Days / 4 Nights</option>
                <option value={6}>6 Days / 5 Nights</option>
                <option value={7}>7 Days / 6 Nights (1 Week)</option>
                <option value={8}>8 Days / 7 Nights</option>
                <option value={10}>10 Days / 9 Nights</option>
              </select>
            </div>

            {/* Trip Theme */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles size={14} className="text-brand-600" />
                Trip Style
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
                Agency Name (For PDF Header)
              </label>
              <input
                type="text"
                placeholder="e.g. Royal Travels Pvt Ltd"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition font-medium text-slate-800"
              />
            </div>

            {/* WhatsApp Number */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Phone size={14} className="text-emerald-600" />
                WhatsApp / Mobile Number
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
                placeholder="info@travelagency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>100% Free • Clean A4 Printable PDF • No Watermarks</span>
            </div>

            <button
              type="submit"
              disabled={loading || !destination.trim()}
              className="w-full sm:w-auto px-8 py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/25 transition cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating AI Itinerary...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate Itinerary Now ➔
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div id="itinerary-preview-anchor" />

      {/* Generated Itinerary Output */}
      {parsed && (
        <div className="space-y-6">
          
          {/* Action Bar (Hidden in Print) */}
          <div id="action-bar" className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 text-white rounded-2xl shadow-xl print-hide">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <div>
                <p className="font-bold text-sm text-white">
                  {destination} ({days} Days / {Math.max(1, days - 1)} Nights)
                </p>
                <p className="text-xs text-slate-400">
                  Ready to download or send on WhatsApp
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy WhatsApp Text"}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-brand-500/20 cursor-pointer"
              >
                <Printer size={15} />
                Download / Print A4 PDF
              </button>
            </div>
          </div>

          {/* ==========================================================
              CLEAN A4 PRINTABLE ITINERARY VOUCHER DOCUMENT
              ========================================================== */}
          <div id="printable-itinerary" className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xl print:p-0 print:border-none print:shadow-none print:rounded-none">
            
            {/* Document Header / Agency Banner */}
            <div className="border-b-2 border-brand-500 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200">
                  Official Travel Itinerary
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                  {destination} Tour Package
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1.5 font-medium">
                  <span>📅 {days} Days / {Math.max(1, days - 1)} Nights</span>
                  <span>•</span>
                  <span>✨ {tripType}</span>
                </div>
              </div>

              <div className="sm:text-right bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-2xl border sm:border-0 border-slate-200 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Prepared By
                </p>
                <p className="text-base font-extrabold text-slate-900">
                  {agencyName || "EzzySync Partner Agency"}
                </p>
                {phone && <p className="text-xs text-brand-700 font-semibold mt-0.5">📞 {phone}</p>}
                {email && <p className="text-xs text-slate-500 mt-0.5">✉️ {email}</p>}
              </div>
            </div>

            {/* Day-by-Day Timeline Cards */}
            <div className="space-y-6">
              {parsed.days.map((d, idx) => (
                <div key={idx} className="itinerary-day-card border border-slate-200 rounded-2xl p-5 sm:p-6 bg-slate-50/50 print:bg-white print:border-slate-300">
                  <div className="flex items-center gap-3 mb-3 border-b border-slate-200/60 pb-2.5">
                    <span className="px-3 py-1 bg-brand-600 text-white font-black text-xs rounded-lg uppercase tracking-wide shrink-0">
                      Day {idx + 1}
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900">
                      {d.title.replace(/^Day\s*\d+[:\s-]*/i, "")}
                    </h3>
                  </div>

                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 pl-1">
                    {d.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="mt-0.5 shrink-0 text-brand-600 font-bold">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Inclusions & Exclusions Grid */}
            <div className="inclusions-block grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8 pt-6 border-t border-slate-200">
              
              {/* Inclusions */}
              <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 print:bg-white print:border-emerald-300 space-y-3">
                <h4 className="font-extrabold text-sm text-emerald-900 flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  Package Inclusions
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {parsed.inclusions.length > 0 ? (
                    parsed.inclusions.map((inc, iIdx) => (
                      <li key={iIdx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{inc}</span>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="flex items-start gap-2"><span className="text-emerald-600 font-bold">✓</span> Daily Breakfast at Hotel</li>
                      <li className="flex items-start gap-2"><span className="text-emerald-600 font-bold">✓</span> AC Private Vehicle for transfers & sightseeing</li>
                      <li className="flex items-start gap-2"><span className="text-emerald-600 font-bold">✓</span> Tolls, Parking & Driver Allowances</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Exclusions */}
              <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/40 print:bg-white print:border-rose-300 space-y-3">
                <h4 className="font-extrabold text-sm text-rose-900 flex items-center gap-2">
                  <XCircle size={16} className="text-rose-600 shrink-0" />
                  Package Exclusions
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {parsed.exclusions.length > 0 ? (
                    parsed.exclusions.map((exc, eIdx) => (
                      <li key={eIdx} className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">✕</span>
                        <span>{exc}</span>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="flex items-start gap-2"><span className="text-rose-500 font-bold">✕</span> Flights & Train Tickets</li>
                      <li className="flex items-start gap-2"><span className="text-rose-500 font-bold">✕</span> Personal Expenses, Tips & Laundry</li>
                      <li className="flex items-start gap-2"><span className="text-rose-500 font-bold">✕</span> Monument Entry Fees & Optional Activities</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            {/* Travel Tips (If any) */}
            {parsed.tips.length > 0 && (
              <div className="inclusions-block mt-6 p-4 rounded-2xl border border-amber-200 bg-amber-50/40 print:bg-white text-xs text-slate-700 space-y-2">
                <p className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Lightbulb size={15} className="text-amber-600 shrink-0" />
                  Specialist Travel Tips
                </p>
                <ul className="space-y-1 pl-5 list-disc marker:text-amber-500">
                  {parsed.tips.map((tip, tIdx) => (
                    <li key={tIdx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Document Print Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
              <p>Generated via EzzySync Travel Engine • Contact {phone || "Agency"} for bookings</p>
              <p>Rates subject to room availability at time of confirmation</p>
            </div>

          </div>

          {/* Upsell Banner (Hidden in Print) */}
          <div id="upsell-cta" className="p-8 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl print-hide">
            <div className="space-y-2 max-w-xl">
              <span className="text-xs font-extrabold uppercase tracking-widest bg-white/20 text-white px-3 py-1 rounded-full">
                EzzySync Travel CRM
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Want to send WhatsApp Itineraries & GST Invoices in 1 Click?
              </h3>
              <p className="text-xs sm:text-sm text-brand-100 leading-relaxed">
                Connect your WhatsApp via QR code, auto-capture leads, manage bookings, and let 24x7 AI handle inquiries.
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

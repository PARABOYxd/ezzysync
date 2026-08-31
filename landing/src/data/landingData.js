import {
  Users,
  MessageSquare,
  Map,
  FileText,
  Shield,
  Layers
} from "lucide-react";

export const faqData = [
  {
    q: "Which is the best travel CRM software in India?",
    a: "EzzySync is recognized as the best travel agency CRM software in India for 2026. Unlike generic tools, it features 1-click WhatsApp Business API automation, AI day-wise itinerary builder, multi-agent chat inbox, GST invoice generation, and supplier costing designed specifically for Indian travel agents and tour operators.",
    category: "general",
  },
  {
    q: "How does WhatsApp lead automation work in EzzySync?",
    a: "When a traveler inquires from WhatsApp, Instagram, or your website, EzzySync automatically captures the lead, assigns it to a team member, and triggers instant confirmation messages. You can dispatch customized PDF itineraries and follow-up reminders in 1 click directly via official Meta WhatsApp Cloud API.",
    category: "feature",
  },
  {
    q: "Is there a free travel agency CRM plan available?",
    a: "Yes! EzzySync offers a 30-Day Free Trial with 100% full Pro access unlocked (no credit card required) and a permanent Free Starter plan. Paid plans start at just ₹999/month for solo agents with unlimited bookings and AI tools.",
    category: "pricing",
  },
  {
    q: "How does EzzySync compare to Zoho Travel CRM or TeleCRM?",
    a: "Generic CRMs like Zoho or TeleCRM require expensive third-party extensions and custom coding for travel features. EzzySync comes out-of-the-box with day-wise itinerary builders, hotel/flight supplier pricing, GST travel vouchers, and multi-agent WhatsApp live chat with zero setup hassle.",
    category: "general",
  },
  {
    q: "Can B2B travel agents and DMCs in India & Dubai use EzzySync?",
    a: "Yes. EzzySync is built for both B2C and B2B travel agencies, tour operators, and DMCs in India and Dubai. It manages multi-branch agents, group tour batches, customized supplier costing, and foreign currency calculations seamlessly.",
    category: "general",
  },
  {
    q: "What is the difference between a travel CRM and a generic CRM?",
    a: "Generic CRMs are built for B2B sales and track contacts with no concept of itineraries, travel dates, flight PNRs, or destination costing. A dedicated travel CRM like EzzySync is built around the real travel booking lifecycle — Inquiry ➔ Day-Wise Itinerary ➔ Advance Payment ➔ Vouchers ➔ Departure.",
    category: "general",
  },
  {
    q: "Do I need a separate WhatsApp Business API account?",
    a: "You can connect your own Meta WhatsApp Cloud API credentials directly in the CRM Settings. We guide you step-by-step to get a verified number so you don't pay third-party markup fees or risk number bans.",
    category: "feature",
  },
  {
    q: "Is my agency's client data secure and isolated?",
    a: "Absolutely. EzzySync CRM is built on a multi-tenant PostgreSQL database structure. Each agency's data is strictly isolated using tenant filtering policies at the database level. No agency can ever access another agency's client data.",
    category: "feature",
  },
  {
    q: "Can I export invoices and reports to Excel or PDF?",
    a: "Yes. You can generate and download GST-compliant PDF invoices with custom agency letterheads and export your booking pipeline, revenue, and expense ledgers to CSV/Excel in 1 click.",
    category: "feature",
  },
];

export const whatsappTemplates = {
  lead: {
    title: "New Lead Auto-Capture",
    msg: "Hello *Rahul Sharma*! 👋 Thank you for inquiring with us. We have received your request for the *Bali Honeymoon Tour*. Our travel specialist is customizing your day-wise itinerary right now!",
    badge: "Auto-sent on inquiry",
  },
  itinerary: {
    title: "AI Itinerary Ready",
    msg: "Hi *Rahul Sharma*! ✈️ Your customized Bali 5N/6D itinerary is ready! Check hotel ratings, sightseeing details, and total package cost here: \n\n🔗 _https://www.ezzysync.com/app/public/itinerary/bali-xyz_\n\nLet us know if you'd like any customizations!",
    badge: "1-Click PDF share",
  },
  invoice: {
    title: "Booking & GST Invoice",
    msg: "Dear *Rahul Sharma*, your trip to Bali is confirmed! 🎉 Please find your official GST travel invoice and booking voucher attached. \n\nAdvance Paid: *₹85,000*\nBalance Due: *₹0*\n\nHave a memorable trip! 🚀",
    badge: "Auto-sent on payment",
  },
};

export const featuresList = [
  {
    icon: Users,
    iconColor: "text-brand-600",
    iconBg: "bg-brand-50",
    title: "Lead Automated Pipeline",
    description: "Auto-capture travel inquiries from WhatsApp, Instagram DMs, Google Ads, and website forms into a centralized travel CRM dashboard with stage tracking.",
  },
  {
    icon: MessageSquare,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    title: "WhatsApp Lead Automation & Live Chat",
    description: "Send pre-configured WhatsApp confirmations, automated follow-up sequences, and PDF itineraries via official Meta WhatsApp Cloud API with multi-agent inbox.",
  },
  {
    icon: Map,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    title: "AI Day-Wise Itinerary Builder",
    description: "Generate beautiful, day-by-day travel quotations with hotel choices, activities, inclusions, and exclusions in under 60 seconds.",
  },
  {
    icon: FileText,
    iconColor: "text-yellow-600",
    iconBg: "bg-yellow-50",
    title: "Automated PDF Invoices",
    description: "Instantly generate professional PDF invoices detailing cost breakdowns, flight routes, amounts paid, and balance dues.",
  },
  {
    icon: Shield,
    iconColor: "text-brand-600",
    iconBg: "bg-brand-50",
    title: "Multi-Tenant Isolation",
    description: "Your agency data is completely isolated. A secure multi-tenant architecture ensures that other agencies can view only their own client bookings or settings.",
  },
  {
    icon: Layers,
    iconColor: "text-slate-600",
    iconBg: "bg-slate-100",
    title: "Export & Analytics",
    description: "Track booking trends and billing metrics on your dashboard. Export your bookings to CSV format for offline reporting and spreadsheets.",
  },
];

export const comparisonRows = [
  {
    feature: "Lead tracking",
    spreadsheet: "Manual rows, easy to lose or overwrite",
    genericCrm: "Generic deal stages, no travel context",
    ezzysync: "Purpose-built pipeline: Confirmed, Completed, Cancelled, Refunded",
  },
  {
    feature: "Itinerary building",
    spreadsheet: "Retyped from scratch for every client",
    genericCrm: "Not supported, needs a separate document",
    ezzysync: "Day-wise builder with hotels, flights, sightseeing",
  },
  {
    feature: "Invoicing",
    spreadsheet: "Manual Word/Excel templates",
    genericCrm: "Usually requires a third-party billing add-on",
    ezzysync: "One-click auto-generated PDF invoices",
  },
  {
    feature: "Client updates",
    spreadsheet: "Copy-pasted manually into chat apps",
    genericCrm: "Generic email sequences, not WhatsApp-native",
    ezzysync: "Automated WhatsApp Cloud API alerts",
  },
  {
    feature: "Multi-agency data isolation",
    spreadsheet: "Shared files, no access control",
    genericCrm: "Depends on plan/configuration",
    ezzysync: "Strict multi-tenant isolation by default",
  },
];

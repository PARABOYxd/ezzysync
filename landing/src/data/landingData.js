import {
  Users,
  MessageSquare,
  Map,
  FileText,
  Shield,
  Layers
} from "lucide-react";
import { PLAN_PRICE_MONTHLY } from "./plans";

export const faqData = [
  {
    q: "Can I import my existing Excel leads?",
    a: "Yes. You can upload your existing client and lead lists using our standard CSV/Excel import tool with automatic column mapping for names, phone numbers, and destination preferences.",
    category: "feature",
  },
  {
    q: "Can multiple team members use EzzySync?",
    a: "Yes. Depending on your plan, you can invite sales coordinators and managers. Agency administrators can assign leads to coordinators and view overall pipeline progress in real time.",
    category: "feature",
  },
  {
    q: "Can I connect my WhatsApp Business number?",
    a: "Yes. You connect your official WhatsApp Business number directly using Meta WhatsApp Cloud API credentials in your agency settings, with zero third-party per-message platform markup.",
    category: "feature",
  },
  {
    q: "How does Meta WhatsApp integration work?",
    a: "EzzySync integrates directly with Meta's official Graph API. Once configured in Settings, you can send automated lead welcome templates, quotation links, and payment reminders directly from your verified business number.",
    category: "feature",
  },
  {
    q: "Can I create quotations and itineraries?",
    a: "Yes. You can build day-by-day itineraries with hotel stays, daily tours, and transportation inclusions. The system automatically creates both a responsive public web link and downloadable PDF quotation.",
    category: "feature",
  },
  {
    q: "Can I track payments?",
    a: "Yes. EzzySync includes a milestone payment ledger to track advance deposits, interim installments, and remaining balances. You can also connect your own Razorpay credentials for automated webhook reconciliation.",
    category: "feature",
  },
  {
    q: "Can I export my data?",
    a: "Yes. You maintain full ownership of your data. You can download all your bookings, traveler records, and financial receipts as standard CSV/Excel files and export documents as PDF at any time.",
    category: "feature",
  },
  {
    q: "How does the trial work?",
    a: "You can evaluate EzzySync with full access and no credit card required. When you are ready, you can choose the Solo Agent or Agency Growth plan to continue using your workspace. Nothing is ever charged automatically without your consent.",
    category: "pricing",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. EzzySync subscriptions are flexible with no long-term lock-in contracts. You can pause, cancel, or switch plans anytime directly from your agency profile settings.",
    category: "pricing",
  },
  {
    q: "How long does setup take?",
    a: "Basic workspace setup takes just a few minutes. You can create an account, enter your agency branding details, and create your first itinerary immediately. Connecting the Meta WhatsApp Cloud API takes a short setup through the Meta developer portal.",
    category: "general",
  },
];

export const whatsappTemplates = {
  lead: {
    title: "New Lead Auto-Capture",
    msg: "Hello *Rahul Sharma*! 👋 Thank you for inquiring with us. We have received your request for the *Bali Honeymoon Tour*. Our travel specialist is customizing your day-wise itinerary right now!",
    badge: "Auto-sent on inquiry",
  },
  itinerary: {
    title: "AI Day-Wise Itinerary Ready",
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
    title: "Day-Wise Itinerary Builder",
    description: "Build structured day-by-day travel quotations with hotel stays, transfers, activities, inclusions, and exclusions with 1-click PDF export.",
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

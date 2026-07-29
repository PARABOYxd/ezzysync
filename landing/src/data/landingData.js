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
    q: "Do I need a separate WhatsApp Business API account?",
    a: "Yes, you can integrate your own Meta WhatsApp Cloud API credentials directly in the CRM Settings. We guide you step-by-step to get a free phone number ID and access token from Meta so you don't pay third-party markup fees.",
  },
  {
    q: "Is my agency's client data secure and isolated?",
    a: "Absolutely. JourneyFlow CRM is built on a multi-tenant PostgreSQL database structure. Each agency's data is isolated using a strict tenant filtering policy at the database query level. No agency can ever read or write another agency's data.",
  },
  {
    q: "Can I export invoices and reports to Excel or PDF?",
    a: "Yes, you can download any invoice as a beautifully formatted PDF directly from the interface, and you can export all your bookings and financial reports to standard CSV/Excel format with a single click.",
  },
  {
    q: "Does JourneyFlow support multiple agents with different permissions?",
    a: "Currently, our system supports agency-wide credentials. We are rolling out multi-agent role-based permissions (Admin, Agent, Finance) in our upcoming release next month.",
  },
];

export const whatsappTemplates = {
  lead: {
    title: "New Lead Welcome",
    msg: "Hello *Rahul Sharma*! 👋 Thank you for choosing JourneyFlow. We have received your inquiry for the *Bali Adventure Tour*. Our agent is preparing the best customized itinerary for you. Stay tuned!",
    badge: "Auto-sent on inquiry",
  },
  itinerary: {
    title: "Itinerary Ready",
    msg: "Hi *Rahul Sharma*! ✈️ Your customized Bali itinerary is ready! Check the day-by-day hotels, sightseeing details, and costs here: \n\n🔗 _https://app.journeyflowcrm.com/public/itinerary/bali-xyz_\n\nLet us know if you want to make any changes!",
    badge: "One-click share",
  },
  invoice: {
    title: "Invoice & Booking",
    msg: "Dear *Rahul Sharma*, your booking for Bali is confirmed! 🎉 Please find your digital booking invoice below. \n\nTotal Paid: *₹85,000*\nBalance Due: *₹0*\n\nThank you for traveling with us! 🚀",
    badge: "Auto-sent on payment",
  },
};

export const featuresList = [
  {
    icon: Users,
    iconColor: "text-brand-600",
    iconBg: "bg-brand-50",
    title: "Lead Pipeline",
    description: "Log travel inquiries from customers. Add client preferences and track bookings across statuses such as Confirmed, Completed, Cancelled, and Refunded.",
  },
  {
    icon: MessageSquare,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    title: "WhatsApp Integration",
    description: "Send pre-configured messages and itinerary links directly to clients on WhatsApp using official Meta APIs.",
  },
  {
    icon: Map,
    iconColor: "text-rose-550",
    iconBg: "bg-rose-50",
    title: "Itinerary Builder",
    description: "Build day-by-day travel itineraries. Add detailed daily schedules, flight routes, hotel options, and sightseeing points.",
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

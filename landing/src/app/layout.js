import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

export const metadata = {
  title: "EzzySync™ | Best Travel CRM Software for Tour Operators & Travel Agencies",
  description: "EzzySync is the #1 cloud-based Travel CRM software in India for tour operators and travel agencies. Automate WhatsApp leads, generate day-wise itineraries, issue GST quotations (SAC 998555), and manage bookings on one unified dashboard. Start free trial.",
  metadataBase: new URL("https://www.ezzysync.com"),
  keywords: [
    "travel crm",
    "best travel crm",
    "travel crm software",
    "best travel crm in india",
    "best travel crm software",
    "best travel crm software in india",
    "travel agency crm",
    "travel agency crm software",
    "best travel agency crm",
    "best travel agency crm software 2026",
    "travel quotation software",
    "itinerary builder software",
    "tour operator crm",
    "travel lead management software",
    "whatsapp travel crm",
    "b2b travel crm",
    "travel crm india",
    "tour management software",
    "ezzysync"
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "EzzySync™ | Best Travel CRM Software for Tour Operators & Travel Agencies",
    description: "EzzySync is the #1 cloud-based Travel CRM software in India for tour operators and travel agencies. Automate WhatsApp leads, generate day-wise itineraries, issue GST quotations (SAC 998555), and manage bookings on one unified dashboard. Start free trial.",
    url: "https://www.ezzysync.com",
    siteName: "EzzySync Travel CRM",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/dashboard_mockup.jpg",
        width: 1200,
        height: 630,
        alt: "EzzySync — Best Travel CRM Software for Tour Operators & Travel Agencies",
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "EzzySync™ | Best Travel CRM Software for Tour Operators & Travel Agencies",
    description: "EzzySync is the #1 cloud-based Travel CRM software in India for tour operators and travel agencies. Automate WhatsApp leads, generate day-wise itineraries, issue GST quotations (SAC 998555), and manage bookings on one unified dashboard. Start free trial.",
    images: ["/dashboard_mockup.jpg"],
  },
};

export default function RootLayout({ children }) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "EzzySync",
      "alternateName": ["EzzySync CRM", "EzzySync Travel CRM", "EasySync Travel CRM"],
      "url": "https://www.ezzysync.com",
      "logo": "https://www.ezzysync.com/logo.png",
      "telephone": "+91-8826610820",
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+91-8826610820",
        "email": "support@ezzysync.com",
        "contactType": "customer service"
      },
      "sameAs": [
        "https://www.instagram.com/ezzysync?igsh=MXRpcmJlYnR2aHc4NQ==",
        "https://www.facebook.com/share/1BtkdG3H7G/?mibextid=wwXIfr" 
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "EzzySync Travel CRM",
      "alternateName": ["EzzySync", "EzzySync CRM"],
      "url": "https://www.ezzysync.com",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://www.ezzysync.com/blog?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "EzzySync Travel CRM",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "All (Cloud-Based SaaS)",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR",
        "description": "Free Evaluation Account"
      },
      "description": "All-in-one Travel CRM software with direct WhatsApp lead capture, day-wise itinerary builder, GST invoice generator, and booking management for tour operators and travel agencies.",
      "featureList": [
        "Official Meta WhatsApp Cloud API Integration",
        "Day-Wise Travel Itinerary Generator with PDF",
        "Tour Operator SAC 998555 GST Invoicing & Quotations",
        "Lead Management & Follow-up Tracking Pipeline",
        "Hotel & Driver Service Vouchers",
        "Razorpay Webhook Milestone Payment Sync"
      ]
    }
  ];

  return (
    <html
      lang="en"
      className={`${geist.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <noscript>
          <style>{`.reveal { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}

import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

export const metadata = {
  title: "EzzySync — Best Travel CRM Software with WhatsApp Lead Automation & AI Itineraries",
  description: "EzzySync is the best travel agency CRM software in India & Dubai. Automate WhatsApp leads, generate day-wise AI itineraries in 60s, issue GST invoices, and manage bookings on one unified travel CRM dashboard. Start 30-day free trial.",
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
    "travel crm free",
    "free travel crm",
    "travel crm software free",
    "travel crm dashboard",
    "travel agency crm dashboard",
    "travel crm features",
    "travel crm demo",
    "b2b travel crm",
    "travel crm india",
    "travel agency crm dubai",
    "lead automated",
    "whatsapp lead automate",
    "whatsapp travel crm",
    "travel crm login",
    "zoho travel crm alternative",
    "sembark travel crm alternative",
    "tour operator crm",
    "travel booking management software",
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
    title: "EzzySync — Best Travel CRM Software with WhatsApp Lead Automation & AI Itineraries",
    description: "EzzySync is the best travel agency CRM software in India & Dubai. Automate WhatsApp leads, generate day-wise AI itineraries in 60s, issue GST invoices, and manage bookings on one unified travel CRM dashboard. Start 30-day free trial.",
    url: "https://www.ezzysync.com",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/dashboard_mockup.jpg",
        width: 1200,
        height: 630,
        alt: "EzzySync — Best Travel CRM Software with WhatsApp Lead Automation",
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "EzzySync — Best Travel CRM Software with WhatsApp Lead Automation & AI Itineraries",
    description: "EzzySync is the best travel agency CRM software in India & Dubai. Automate WhatsApp leads, generate day-wise AI itineraries in 60s, issue GST invoices, and manage bookings on one unified travel CRM dashboard. Start 30-day free trial.",
    images: ["/dashboard_mockup.jpg"],
  },
};

export default function RootLayout({ children }) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "EzzySync",
      "alternateName": ["EasySync", "EssySync", "Ezzy Sync", "EasySync CRM", "EzzySync CRM", "EasySync Travel CRM"],
      "url": "https://www.ezzysync.com",
      "logo": "https://www.ezzysync.com/logo.png",
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "jainpayal0201@gmail.com",
        "contactType": "customer support"
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
      "alternateName": ["EasySync", "EssySync", "Ezzy Sync", "EasySync CRM"],
      "url": "https://www.ezzysync.com",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://www.ezzysync.com/blog?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
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


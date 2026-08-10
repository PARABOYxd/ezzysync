import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

export const metadata = {
  title: "EzzySync — Travel CRM with WhatsApp Automation & AI Itinerary Builder",
  description: "EzzySync is the best travel CRM for travel agents — automate client updates via WhatsApp, generate itineraries with AI, and manage billing statements in one platform. Start free.",
  metadataBase: new URL("https://www.ezzysync.com"),
  keywords: ["travel crm", "best travel crm", "travel crm with whatsapp integration", "automated travel itinerary builder", "crm for travel agents", "travel agency crm software", "booking management software", "tour operator crm", "travel booking crm", "itinerary management software", "best crm for travel agency in india", "free travel agency software", "ezzysync"],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "EzzySync — Travel CRM with WhatsApp Automation & AI Itinerary Builder",
    description: "EzzySync is the best travel CRM for travel agents — automate client updates via WhatsApp, generate itineraries with AI, and manage billing statements in one platform. Start free.",
    url: "https://www.ezzysync.com",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/images/og-image.png", // TODO: Create and place 1200x630 OG image in public/images/og-image.png
        width: 1200,
        height: 630,
        alt: "EzzySync — Travel CRM with WhatsApp Automation",
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "EzzySync — Travel CRM with WhatsApp Automation & AI Itinerary Builder",
    description: "EzzySync is the best travel CRM for travel agents — automate client updates via WhatsApp, generate itineraries with AI, and manage billing statements in one platform. Start free.",
    images: ["/images/og-image.png"], // TODO: Create and place 1200x630 OG image in public/images/og-image.png
  },
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [
      { url: '/logo.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "EzzySync",
      "url": "https://www.ezzysync.com",
      "logo": "https://www.ezzysync.com/logo.png", // TODO: Create and place logo.png in public/logo.png
      "sameAs": [] // TODO: Add social links here in the future
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "EzzySync",
      "url": "https://www.ezzysync.com"
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


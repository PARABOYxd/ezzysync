import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Travel CRM Software for Travel Agencies | JourneyFlow",
  description: "Scale your travel agency. Centralize leads, build professional itineraries, generate invoices, and automate WhatsApp updates. Start for free.",
  metadataBase: new URL("https://www.journeyflowcrm.com"),
  keywords: ["travel crm", "travel agency crm", "crm for travel agencies", "tour operator crm", "itinerary builder", "lead management", "whatsapp crm", "invoice generator", "journeyflow"],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Travel CRM Software for Travel Agencies | JourneyFlow",
    description: "Scale your travel agency. Centralize leads, build professional itineraries, generate invoices, and automate WhatsApp updates. Start for free.",
    url: "https://www.journeyflowcrm.com",
    siteName: "JourneyFlow",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/images/og-image.png", // TODO: Create and place 1200x630 OG image in public/images/og-image.png
        width: 1200,
        height: 630,
        alt: "JourneyFlow CRM — Travel CRM & Itinerary Builder",
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Travel CRM Software for Travel Agencies | JourneyFlow",
    description: "Scale your travel agency. Centralize leads, build professional itineraries, generate invoices, and automate WhatsApp updates. Start for free.",
    images: ["/images/og-image.png"], // TODO: Create and place 1200x630 OG image in public/images/og-image.png
  },
};

export default function RootLayout({ children }) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "JourneyFlow",
      "url": "https://www.journeyflowcrm.com",
      "logo": "https://www.journeyflowcrm.com/logo.png", // TODO: Create and place logo.png in public/logo.png
      "sameAs": [] // TODO: Add social links here in the future
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "JourneyFlow",
      "url": "https://www.journeyflowcrm.com"
    }
  ];

  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}


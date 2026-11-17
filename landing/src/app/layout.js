import { Geist, Funnel_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { TEL_PHONE, SUPPORT_EMAIL } from "@/lib/contact";
import SiteAnalytics from "@/components/common/SiteAnalytics";
import MotionProvider from "@/components/motion/MotionProvider";
import Cursor from "@/components/motion/Cursor";
import { SITE_URL } from "@/lib/siteLinks";

// Body: quiet and clean.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

// Display: the one voice for every large headline.
const funnel = Funnel_Display({
  subsets: ["latin"],
  variable: "--font-funnel",
  display: "swap",
});

export const metadata = {
  title: "Travel CRM for Travel Agencies & Tour Operators | EzzySync",
  description: "Travel CRM for Indian agencies and tour operators: WhatsApp leads, day-wise itineraries, GST quotes and payment tracking in one place. Start a free trial.",
  metadataBase: new URL("https://www.ezzysync.com"),
  // No site-wide canonical here: a child page that forgot to set its own
  // would inherit "/" and tell Google it is a duplicate of the homepage.
  // Every page declares its own `alternates.canonical`.
  robots: {
    index: true,
    follow: true,
  },
  // Search Console / Bing Webmaster ownership, set per deployment in env.
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }),
    ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION && { other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } }),
  },
  openGraph: {
    title: "Travel CRM for Travel Agencies & Tour Operators | EzzySync",
    description: "Travel CRM for Indian agencies and tour operators: WhatsApp leads, day-wise itineraries, GST quotes and payment tracking in one place. Start a free trial.",
    url: "https://www.ezzysync.com",
    siteName: "EzzySync Travel CRM",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Travel CRM for Travel Agencies & Tour Operators | EzzySync",
    description: "Travel CRM for Indian agencies and tour operators: WhatsApp leads, day-wise itineraries, GST quotes and payment tracking in one place. Start a free trial.",
  },

};

export default function RootLayout({ children }) {
  // Site-wide entities only. The product (SoftwareApplication + prices) and
  // FAQ live on the homepage; @id lets those reference this Organization
  // instead of declaring a second, conflicting copy.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      "name": "EzzySync",
      "alternateName": ["EzzySync CRM", "EzzySync Travel CRM", "EasySync Travel CRM"],
      "url": SITE_URL,
      "logo": `${SITE_URL}/logo.png`,
      "telephone": TEL_PHONE,
      "email": SUPPORT_EMAIL,
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": TEL_PHONE,
        "email": SUPPORT_EMAIL,
        "contactType": "customer service",
        "areaServed": "IN"
      },
      "sameAs": [
        "https://www.instagram.com/ezzysync",
        "https://www.facebook.com/share/1BtkdG3H7G/"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      "name": "EzzySync Travel CRM",
      "alternateName": ["EzzySync", "EzzySync CRM"],
      "url": SITE_URL,
      "inLanguage": "en-IN",
      "publisher": { "@id": `${SITE_URL}/#organization` }
    }
  ];

  return (
    <html
      lang="en-IN"
      className={`${geist.variable} ${funnel.variable} h-full antialiased`}
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
        <MotionProvider>{children}</MotionProvider>
        <Cursor />
        <Analytics />
        <SiteAnalytics />
      </body>
    </html>
  );
}

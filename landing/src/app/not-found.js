import React from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getCrmUrl, getLoginUrl } from "@/lib/crmUrl";

export const metadata = {
  title: "Page not found | EzzySync",
  robots: { index: false, follow: true },
};

const suggestions = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/free-itinerary-builder", label: "Free itinerary builder" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact us" },
];

export default function NotFound() {
  const crmUrl = getCrmUrl();
  return (
    <div className="min-h-screen bg-paper text-ink-900 font-sans flex flex-col">
      <Navbar crmUrl={crmUrl} />
      <main className="flex-1 wrap section-y">
        <p className="t-label text-ink-600">Error 404</p>
        <h1 className="t-display mt-8 text-ink-900 max-w-[11ch]">This page doesn&apos;t exist</h1>
        <p className="mt-8 t-lead text-ink-600 max-w-xl">
          The link may be old or mistyped. Looking for your CRM account?{" "}
          <a href={getLoginUrl(crmUrl)} className="text-ink-900 link-line">Sign in here</a>.
        </p>
        <ul className="mt-16 border-t border-ink-900 max-w-3xl">
          {suggestions.map((s) => (
            <li key={s.href} className="border-b border-line">
              <Link href={s.href} className="group flex items-center justify-between py-5 font-display text-[clamp(22px,2.2vw,32px)] tracking-[-0.03em] text-ink-900">
                <span className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-2">{s.label}</span>
                <span aria-hidden="true" className="text-ink-600 transition-transform duration-500 group-hover:translate-x-1">&rarr;</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

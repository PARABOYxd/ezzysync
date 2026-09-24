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
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      <Navbar crmUrl={crmUrl} />
      <main className="flex-1 max-w-[760px] w-full mx-auto px-5 sm:px-6 py-20 sm:py-28">
        <p className="text-sm font-semibold text-slate-500">404</p>
        <h1 className="mt-2 font-bold text-3xl sm:text-4xl tracking-tight text-slate-950">This page doesn&apos;t exist</h1>
        <p className="mt-4 text-slate-600 text-lg">
          The link may be old or mistyped. Looking for your CRM account?{" "}
          <a href={getLoginUrl(crmUrl)} className="text-brand-600 font-semibold hover:underline">Sign in here</a>.
        </p>
        <ul className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {suggestions.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="block rounded-xl border border-slate-200 px-4 py-3 font-medium text-slate-800 hover:border-brand-400 hover:text-brand-700"
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

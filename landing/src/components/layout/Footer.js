import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getLoginUrl } from "@/lib/crmUrl";
import { featurePages, solutionPages } from "@/content/seoPages";
import { comparePages } from "@/content/comparePages";
import { waLink, DISPLAY_PHONE, TEL_PHONE, SUPPORT_EMAIL, SUPPORT_HOURS } from "@/lib/contact";

const SOCIALS = [
  { href: "https://www.instagram.com/ezzysync", label: "Instagram" },
  { href: "https://www.facebook.com/share/1BtkdG3H7G/", label: "Facebook" },
  { href: waLink(), label: "WhatsApp" },
];

function Column({ title, children }) {
  return (
    <div>
      <h2 className="t-label text-white/45 !font-sans !tracking-[0.14em]">{title}</h2>
      <ul className="mt-6 space-y-3 text-[15px] text-white/80">{children}</ul>
    </div>
  );
}

const linkCls = "link-line hover:text-paper";

export default function Footer({ crmUrl }) {
  const loginUrl = getLoginUrl(crmUrl);

  return (
    <footer data-theme="dark" className="bg-ink-900 text-paper">
      <div className="wrap pt-[clamp(96px,10vw,160px)] pb-10">
        {/* Headline contact */}
        <p className="t-label text-white/45">Write to us</p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          data-cursor="Write"
          className="group mt-6 inline-flex items-end gap-4 t-h2 text-paper hover:text-accent transition-colors duration-500 break-all sm:break-normal"
        >
          {SUPPORT_EMAIL}
          <ArrowUpRight
            aria-hidden="true"
            strokeWidth={1.25}
            className="w-[0.6em] h-[0.6em] mb-[0.1em] shrink-0 transition-transform duration-500 group-hover:translate-x-2 group-hover:-translate-y-2"
          />
        </a>

        <div className="mt-[clamp(72px,8vw,128px)] pt-12 border-t border-white/15 grid gap-12 grid-cols-2 md:grid-cols-3 lg:grid-cols-12">
          {/* Office */}
          <div className="col-span-2 md:col-span-3 lg:col-span-4 space-y-8">
            <div>
              <h2 className="t-label text-white/45 !font-sans !tracking-[0.14em]">Office</h2>
              <address className="mt-6 not-italic text-[17px] leading-relaxed text-white/80">
                EzzySync Technologies
                <br />
                India · 100% cloud
                <br />
                {SUPPORT_HOURS}
              </address>
            </div>
            <div className="space-y-2 text-[17px]">
              <a href={`tel:${TEL_PHONE}`} className={`block w-fit ${linkCls}`}>Sales {DISPLAY_PHONE}</a>
              <a href={waLink()} target="_blank" rel="noopener noreferrer" className={`block w-fit ${linkCls}`}>
                WhatsApp {DISPLAY_PHONE}
              </a>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-white/80">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className={linkCls}>{s.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <Column title="Features">
              {featurePages.map((p) => (
                <li key={p.slug}><Link href={`/features/${p.slug}`} className={linkCls}>{p.label}</Link></li>
              ))}
              <li><Link href="/free-itinerary-builder" className={linkCls}>Free itinerary builder</Link></li>
            </Column>
          </div>

          <div className="lg:col-span-3">
            <Column title="Who it's for">
              {solutionPages.map((p) => (
                <li key={p.slug}><Link href={`/solutions/${p.slug}`} className={linkCls}>{p.label}</Link></li>
              ))}
              {comparePages.map((p) => (
                <li key={p.slug}><Link href={`/compare/${p.slug}`} className={linkCls}>{p.label}</Link></li>
              ))}
              <li><Link href="/compare/zoho" className={linkCls}>EzzySync vs Zoho CRM</Link></li>
              <li><Link href="/compare/telecrm" className={linkCls}>EzzySync vs TeleCRM</Link></li>
            </Column>
          </div>

          <div className="col-span-2 md:col-span-1 lg:col-span-2">
            <Column title="Company">
              <li><Link href="/pricing" className={linkCls}>Pricing</Link></li>
              <li><Link href="/about" className={linkCls}>About</Link></li>
              <li><Link href="/blog" className={linkCls}>Blog</Link></li>
              <li><Link href="/contact" className={linkCls}>Contact sales</Link></li>
              <li><a href={loginUrl} className={linkCls}>Agency sign in</a></li>
            </Column>
          </div>
        </div>

        <div className="mt-[clamp(72px,8vw,128px)] pt-8 border-t border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-5 text-[14px] text-white/55">
          <p>&copy; {new Date().getFullYear()} EzzySync Technologies. Built for travel agencies across India.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li><Link href="/terms" className={linkCls}>Terms</Link></li>
            <li><Link href="/privacy" className={linkCls}>Privacy</Link></li>
            <li><Link href="/refund-policy" className={linkCls}>Refund &amp; cancellation</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

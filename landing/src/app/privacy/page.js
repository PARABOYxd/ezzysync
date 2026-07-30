import React from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import LegalContent from "../../components/sections/LegalContent";

export const metadata = {
  title: "Privacy Policy — EzzySync",
  description: "What data EzzySync collects, why, and how it's kept safe.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Privacy Policy — EzzySync",
    description: "What data EzzySync collects, why, and how it's kept safe.",
    url: "https://www.ezzysync.com/privacy",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
  },
};

export default function PrivacyPage() {
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <Navbar crmUrl={crmUrl} />
      <main>
        <LegalContent title="Privacy Policy" updated="30 July 2026">
          <p>
            This explains what data EzzySync collects when you use our travel CRM platform, why we
            collect it, and what we do with it. It's written in plain language on purpose — if
            something's unclear, email <a href="mailto:support@ezzysync.com">support@ezzysync.com</a>.
          </p>

          <h2>1. What we collect</h2>
          <p>When you sign up and use EzzySync, we collect:</p>
          <ul>
            <li><strong>Account info</strong> — your name, email, phone, agency/company name, and password (stored hashed, never in plain text).</li>
            <li><strong>CRM data you enter</strong> — leads, bookings, customer names/contacts, itineraries, invoices, and notes you add for your own agency's use.</li>
            <li><strong>Payment info</strong> — handled directly by Razorpay for paid plans; we don't store your card details ourselves.</li>
            <li><strong>Basic usage data</strong> — page views on our marketing site via Vercel Analytics, which doesn't use invasive tracking cookies.</li>
          </ul>

          <h2>2. Why we collect it</h2>
          <p>
            To run the CRM: store your leads and bookings, generate invoices, send OTPs for login,
            process your subscription payment, and let you optionally connect WhatsApp or Gmail for
            client communication. We don't sell your data, and we don't use your CRM data to advertise
            to you or anyone else.
          </p>

          <h2>3. Third-party services we use</h2>
          <p>To provide the platform, we send limited data to:</p>
          <ul>
            <li><strong>Resend</strong> — sends system emails (OTPs, password resets).</li>
            <li><strong>Razorpay</strong> — processes subscription payments.</li>
            <li><strong>Google Gemini</strong> — powers AI features (itinerary generation, chat parsing), if you use them.</li>
            <li><strong>Meta WhatsApp Cloud API</strong> — only if you connect your own WhatsApp Business account in Settings.</li>
            <li><strong>Google OAuth / Gmail API</strong> — only if you choose to connect your own Gmail account for sending emails.</li>
          </ul>
          <p>Each of these only receives the specific data needed for the feature you're using.</p>

          <h2>4. How your data is stored</h2>
          <p>
            Everything is stored in a PostgreSQL database. Every agency's data is isolated at the
            database level — one agency can never read or write another agency's leads, bookings, or
            customer records. Passwords are hashed with bcrypt; login sessions use signed JWT tokens.
          </p>

          <h2>5. Your CRM data belongs to you</h2>
          <p>
            The leads, bookings, and customer records you enter are yours. We access them only to
            operate the platform (e.g. to render your dashboard) or if you ask us for support. We don't
            use them for any other purpose.
          </p>

          <h2>6. Cookies and analytics</h2>
          <p>
            Our marketing site uses Vercel Analytics for basic, privacy-friendly page-view stats — it
            doesn't set tracking cookies or build advertising profiles. The CRM app uses a session cookie
            or token to keep you logged in; that's required for the app to function.
          </p>

          <h2>7. Your rights</h2>
          <p>You can ask us to:</p>
          <ul>
            <li>Export a copy of your account and CRM data.</li>
            <li>Correct inaccurate account information.</li>
            <li>Delete your account and associated data (subject to what we're legally required to keep, e.g. financial records for tax purposes).</li>
          </ul>
          <p>Email <a href="mailto:support@ezzysync.com">support@ezzysync.com</a> for any of these.</p>

          <h2>8. Data retention</h2>
          <p>
            We keep your data for as long as your account is active. If you close your account, we
            delete your CRM data within a reasonable period, except records we're required to retain
            for legal or tax purposes.
          </p>

          <h2>9. Changes to this policy</h2>
          <p>
            If we change how we handle data, we'll update the date at the top of this page. Significant
            changes will be communicated by email.
          </p>

          <h2>10. Contact</h2>
          <p>
            Questions about your data? Email <a href="mailto:support@ezzysync.com">support@ezzysync.com</a>.
          </p>
        </LegalContent>
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

import React from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import LegalContent from "../../components/sections/LegalContent";

export const metadata = {
  title: "Terms & Conditions — EzzySync",
  description: "The terms that apply when you use EzzySync's travel CRM and booking management platform.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Terms & Conditions — EzzySync",
    description: "The terms that apply when you use EzzySync's travel CRM and booking management platform.",
    url: "https://www.ezzysync.com/terms",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
  },
};

export default function TermsPage() {
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <Navbar crmUrl={crmUrl} />
      <main>
        <LegalContent title="Terms & Conditions" updated="30 July 2026">
          <p>
            These terms apply when you or your travel agency ("you") use EzzySync ("we", "us"), the
            travel CRM and booking management platform at ezzysync.com. By creating an account, you
            agree to them.
          </p>

          <h2>1. What EzzySync is</h2>
          <p>
            EzzySync is software for travel agencies and tour operators to manage leads, itineraries,
            bookings, invoices, and client communication. We provide the platform; you use it to run
            your own travel business.
          </p>

          <h2>2. Your account</h2>
          <p>
            You need a valid email address and password to register. You're responsible for keeping
            your login credentials secure and for everything that happens under your account. Tell us
            immediately if you think someone else has accessed it.
          </p>

          <h2>3. Plans and billing</h2>
          <p>We currently offer three plans:</p>
          <ul>
            <li><strong>Starter</strong> — free, for up to 100 client leads.</li>
            <li><strong>Agency Growth</strong> — ₹2,499/month, billed monthly, with a 7-day free trial before the first charge.</li>
            <li><strong>Enterprise</strong> — custom pricing, agreed separately with our team.</li>
          </ul>
          <p>
            Paid plans are billed in advance through Razorpay. Prices are in Indian Rupees (INR) and
            may change with notice on this page or by email before your next billing cycle.
          </p>

          <h2>4. Free trial</h2>
          <p>
            The Agency Growth plan includes a 7-day free trial. You won't be charged during the trial.
            If you don't cancel before it ends, your card will be charged for the first billing period.
          </p>

          <h2>5. Cancelling</h2>
          <p>
            You can cancel anytime by emailing <a href="mailto:support@ezzysync.com">support@ezzysync.com</a>.
            Cancellation takes effect at the end of your current billing period — you keep access until
            then, and we don't charge you again after that. See our{" "}
            <a href="/refund-policy">Refund Policy</a> for how refunds work.
          </p>

          <h2>6. Your data</h2>
          <p>
            Any leads, bookings, customer records, and itineraries you enter into EzzySync belong to you
            and your agency, not to us. Each agency's data is kept isolated from every other agency on
            the platform. If you close your account, you can request an export of your data before we
            delete it — see our <a href="/privacy">Privacy Policy</a> for details.
          </p>

          <h2>7. Acceptable use</h2>
          <p>You agree not to use EzzySync to:</p>
          <ul>
            <li>Send unsolicited bulk messages (spam) via the WhatsApp or email features.</li>
            <li>Store or process data you don't have the right to hold (e.g. client data collected without consent).</li>
            <li>Attempt to access another agency's data or disrupt the platform's operation.</li>
            <li>Use the platform for anything illegal under Indian law.</li>
          </ul>
          <p>We may suspend accounts that violate this.</p>

          <h2>8. Third-party services</h2>
          <p>
            Some features depend on services you connect yourself — the Meta WhatsApp Cloud API for
            WhatsApp messaging, and Google OAuth if you choose to send email through your own Gmail
            account. Your use of those services is also subject to their own terms.
          </p>

          <h2>9. Service availability</h2>
          <p>
            We aim to keep EzzySync available and working, but we don't guarantee uninterrupted uptime.
            We're not liable for losses caused by downtime, maintenance, or issues with third-party
            services we depend on (payments, email, WhatsApp, AI features).
          </p>

          <h2>10. Limitation of liability</h2>
          <p>
            EzzySync is provided as-is. To the extent permitted by law, we aren't liable for indirect
            or consequential losses arising from your use of the platform. Our total liability for any
            claim is limited to the amount you paid us in the 3 months before the claim.
          </p>

          <h2>11. Changes to these terms</h2>
          <p>
            We may update these terms as the product changes. We'll update the date at the top of this
            page when we do. Continuing to use EzzySync after a change means you accept the update.
          </p>

          <h2>12. Governing law</h2>
          <p>These terms are governed by the laws of India.</p>

          <h2>13. Contact</h2>
          <p>
            Questions about these terms? Email <a href="mailto:support@ezzysync.com">support@ezzysync.com</a>.
          </p>
        </LegalContent>
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

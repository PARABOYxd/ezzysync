import React from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import LegalContent from "../../components/sections/LegalContent";
import { getCrmUrl } from "@/lib/crmUrl";
import { PLAN_PRICE_MONTHLY } from "@/data/plans";

export const metadata = {
  title: "Refund & Cancellation Policy — EzzySync",
  description: "How cancellation and refunds work for EzzySync's paid plans.",
  alternates: { canonical: "/refund-policy" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Refund & Cancellation Policy — EzzySync",
    description: "How cancellation and refunds work for EzzySync's paid plans.",
    url: "https://www.ezzysync.com/refund-policy",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
  },
};

export default function RefundPolicyPage() {
  const crmUrl = getCrmUrl();

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <Navbar crmUrl={crmUrl} />
      <main>
        <LegalContent title="Refund & Cancellation Policy" updated="6 September 2026">
          <p>
            This page explains how cancellation and refunds work across EzzySync's plans, in plain
            terms. If anything here doesn't cover your situation, email{" "}
            <a href="mailto:support@ezzysync.com">support@ezzysync.com</a> and we'll sort it out directly.
          </p>

          <h2>1. The 30-day free trial</h2>
          <p>
            Every new account gets 30 days of full Agency Growth access, free, with no card required.
            Nothing is charged during the trial and nothing is charged when it ends — there is no card
            on file to charge. If you decide EzzySync isn't for you, simply stop using it; there is
            nothing to cancel and nothing to refund.
          </p>

          <h2>2. When the trial ends</h2>
          <p>
            After 30 days, your workspace is locked until you choose a paid plan. Your data is not
            deleted — it stays exactly as you left it and comes back the moment you subscribe.
          </p>

          <h2>3. How paid plans are billed</h2>
          <p>
            Paid plans ({PLAN_PRICE_MONTHLY.SOLO} for Solo Agent, {PLAN_PRICE_MONTHLY.PRO} for Agency
            Growth) are charged as a single payment through Razorpay for one month of access. We do not
            store your card and we do not charge you automatically — there is no recurring mandate on
            your account. When you want another month, you pay again from the Profile page.
          </p>

          <h2>4. Cancelling</h2>
          <p>
            Because nothing renews on its own, there is nothing to cancel. Simply don't make the next
            payment. You keep full access for the month you already paid for, and you will never see a
            charge you didn't initiate yourself.
          </p>

          <h2>5. Refunds for a month you have paid for</h2>
          <p>
            The 30-day free trial is your chance to evaluate the product in full before paying a rupee,
            so we don't refund a month once it has started — you keep access for the whole month you
            paid for. If something on our side stopped you from using the product for a meaningful part
            of that month, email us and we'll make it right.
          </p>

          <h2>6. Refunds for billing errors</h2>
          <p>
            If you were charged in error — for example, charged twice for the same month, or charged the
            wrong amount — email us within 7 days of the charge and we'll investigate and refund it if it
            was our mistake. Refunds are issued back to the original payment method via Razorpay, and
            typically take 5-7 business days to reflect depending on your bank.
          </p>

          <h2>7. Enterprise plan</h2>
          <p>
            Enterprise pricing and terms, including cancellation and refund terms, are agreed
            individually when you sign up — refer to your specific agreement with us.
          </p>

          <h2>8. How to reach us</h2>
          <p>
            For cancellations, refund requests, or billing questions: email{" "}
            <a href="mailto:support@ezzysync.com">support@ezzysync.com</a> with your account email and,
            if applicable, the payment ID from your Razorpay receipt.
          </p>
        </LegalContent>
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}

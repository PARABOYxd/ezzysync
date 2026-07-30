import React from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import LegalContent from "../../components/sections/LegalContent";

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
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <Navbar crmUrl={crmUrl} />
      <main>
        <LegalContent title="Refund & Cancellation Policy" updated="30 July 2026">
          <p>
            This page explains how cancellation and refunds work across EzzySync's plans, in plain
            terms. If anything here doesn't cover your situation, email{" "}
            <a href="mailto:support@ezzysync.com">support@ezzysync.com</a> and we'll sort it out directly.
          </p>

          <h2>1. Free Starter plan</h2>
          <p>
            The Starter plan is free — there's nothing to refund. You can stop using it or delete your
            account anytime.
          </p>

          <h2>2. Free trial on Agency Growth</h2>
          <p>
            The Agency Growth plan (₹2,499/month) starts with a 7-day free trial. You are not charged
            during these 7 days. If you cancel before the trial ends, you won't be charged at all.
          </p>

          <h2>3. After your trial converts to paid</h2>
          <p>
            If you don't cancel before the trial ends, your first monthly charge goes through and your
            subscription auto-renews every month after that until you cancel.
          </p>

          <h2>4. Cancelling your subscription</h2>
          <p>
            Right now, cancellation is handled manually — email{" "}
            <a href="mailto:support@ezzysync.com">support@ezzysync.com</a> from your account's registered
            email address and we'll cancel it for you. Cancellation takes effect at the <strong>end of
            your current billing period</strong> — you keep full access until then, and you won't be
            charged again after that.
          </p>

          <h2>5. Refunds for completed billing periods</h2>
          <p>
            Because every paid subscription starts with a 7-day free trial, we don't offer refunds for
            time already used within a billing period you were charged for — the trial is your chance
            to evaluate the product before paying. If you cancel mid-period, you keep access until the
            period ends, but we don't refund the unused portion.
          </p>

          <h2>6. Refunds for billing errors</h2>
          <p>
            If you were charged in error — for example, charged twice, charged after you'd already
            cancelled, or charged the wrong amount — email us within 7 days of the charge and we'll
            investigate and refund it if it was our mistake. Refunds are issued back to the original
            payment method via Razorpay, and typically take 5-7 business days to reflect depending on
            your bank.
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

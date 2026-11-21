import React from "react";

export default function LegalContent({ title, updated, children }) {
  return (
    <section className="section-y">
      <div className="max-w-[720px] mx-auto px-5 sm:px-6">
        <header className="mb-10 space-y-2">
          <h1 className="t-h2 text-ink-900">
            {title}
          </h1>
          <p className="text-sm text-slate-400">Last updated: {updated}</p>
        </header>
        <div className="legal-prose">
          {children}
        </div>
      </div>

      <style>{`
        .legal-prose h2 {
          font-size: 1.125rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: #0f172a;
          margin: 2.25rem 0 0.75rem;
        }
        .legal-prose h2:first-child { margin-top: 0; }
        .legal-prose p {
          font-size: 15px;
          line-height: 1.7;
          color: #475569;
          margin: 0 0 1rem;
        }
        .legal-prose ul {
          margin: 0 0 1rem;
          padding-left: 1.25rem;
          color: #475569;
          font-size: 15px;
          line-height: 1.7;
        }
        .legal-prose li { margin-bottom: 0.4rem; }
        .legal-prose li::marker { color: #ea580c; }
        .legal-prose strong { color: #1e293b; font-weight: 600; }
        .legal-prose a { color: #ea580c; text-decoration: underline; text-underline-offset: 2px; }
      `}</style>
    </section>
  );
}

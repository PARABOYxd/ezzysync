import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function PageTeaser({ eyebrow, title, description, href, linkText, bg = "bg-white" }) {
  return (
    <section className={`py-14 sm:py-20 ${bg} relative z-10`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 block">{eyebrow}</span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
          {description}
        </p>
        <div className="pt-2">
          <Link
            href={href}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md shadow-slate-900/10 hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <span>{linkText}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" focusable="false" />
          </Link>
        </div>
      </div>
    </section>
  );
}

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

export default function PageTeaser({ title, description, href, linkText, bg = "bg-white" }) {
  return (
    <section className={`py-16 sm:py-28 ${bg} relative z-10`}>
      <ScrollReveal className="max-w-[1100px] mx-auto px-5 sm:px-6">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="font-semibold text-2xl sm:text-3xl tracking-[-0.02em] text-slate-950">
            {title}
          </h2>
          <p className="text-slate-500 text-base leading-relaxed max-w-[50ch] mx-auto">
            {description}
          </p>
          <div className="pt-2">
            <Link
              href={href}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              <span>{linkText}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" focusable="false" />
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

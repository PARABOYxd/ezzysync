import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getAllPosts } from "@/lib/blog";

/** Latest blog posts as clean rows: date, tag, title. */
export default function Insights({ limit = 4 }) {
  const posts = getAllPosts().slice(0, limit);
  if (posts.length === 0) return null;

  return (
    <section className="section-y">
      <div className="wrap">
        <div className="grid-12 gap-y-8 items-end">
          <p className="col-span-12 lg:col-span-3 t-label text-ink-600">(08) Insights</p>
          <h2 data-split className="col-span-12 lg:col-span-6 t-h2 text-ink-900">From the logbook</h2>
          <div className="col-span-12 lg:col-span-3 lg:text-right">
            <Link href="/blog" className="group inline-flex items-center gap-2 min-h-11 text-[16px] text-ink-900">
              <span className="link-line">All articles</span>
              <ArrowUpRight className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <ul data-stagger className="mt-[clamp(48px,6vw,96px)] border-t border-ink-900">
          {posts.map((p) => (
            <li key={p.slug} className="border-b border-line">
              <Link
                href={`/blog/${p.slug}`}
                data-cursor="Read"
                className="group grid-12 gap-y-2 py-7 sm:py-9 items-baseline transition-colors duration-500 hover:bg-paper-200/60"
              >
                <span className="col-span-6 md:col-span-2 text-[14px] text-ink-600 tabular-nums">
                  <time dateTime={p.isoDate}>{p.date}</time>
                </span>
                <span className="col-span-6 md:col-span-2 t-label text-ink-600 text-right md:text-left">{p.category || "Guide"}</span>
                <span className="col-span-11 md:col-span-7 font-display text-[clamp(22px,2.2vw,34px)] leading-[1.12] tracking-[-0.03em] text-ink-900 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-2">
                  {p.title}
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="col-span-1 justify-self-end w-6 h-6 text-ink-900 transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

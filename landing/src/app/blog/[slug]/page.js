import React from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import authors from "@/data/authors.json";
import { getCrmUrl } from "@/lib/crmUrl";
import { notFound } from "next/navigation";
import { getAllPosts, getPost } from "@/lib/blog";
import { withSeo } from "@/lib/seoOverrides";
import { SITE_URL as SITE, linkLabel, pagesForText } from "@/lib/siteLinks";

const globalCrmUrl = getCrmUrl();

/** Every post is pre-rendered; any other slug is a real 404, not a 200 "not found" page. */
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

/** Per-post title, description and canonical (plus any weekly-job override). */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = getPost(slug);
  if (!article) return {};

  const title = article.metaTitle;
  const description = article.metaDescription || "";
  const url = `${SITE}/blog/${slug}`;

  return withSeo(`/blog/${slug}`, {
    title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: "EzzySync",
      type: "article",
      publishedTime: new Date(article.date).toISOString(),
      ...(article.image && { images: [{ url: article.image }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(article.image && { images: [article.image] }),
    },
  });
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const article = getPost(slug);
  if (!article) notFound();

  const crmUrl = globalCrmUrl;
  const author = authors["rishab-jain"];
  const productPages = pagesForText(`${article.title} ${article.metaDescription || ""} ${article.keyword || ""}`);
  const related = getAllPosts().filter((p) => p.slug !== slug).slice(0, 4);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      <Navbar crmUrl={crmUrl} />
      
      <main className="relative pt-24 pb-20 sm:pt-32 bg-white bg-grid-pattern overflow-hidden">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-brand-100/20 filter blur-[110px] -z-10" aria-hidden="true"></div>
        
        <div className="max-w-[700px] mx-auto px-5 sm:px-6 relative z-10 space-y-8">
          <Link href="/blog" className="text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-wider flex items-center gap-1.5 transition-colors">
            <span>&larr;</span>
            <span>Back to Insights</span>
          </Link>

          {/* Article Header */}
          <div className="space-y-4 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-100">{article.category}</span>
              <span className="text-slate-400">{article.date}</span>
              <span className="text-slate-300">&bull;</span>
              <span className="text-slate-400">{article.readTime}</span>
            </div>
            <h1 className="font-semibold text-slate-950 text-2xl sm:text-3xl tracking-[-0.02em] leading-tight">
              {article.title}
            </h1>
            {author && (
              <div className="flex items-center gap-3 pt-4 mt-4 border-t border-slate-100">
                <img src={author.avatar} alt={author.name} className="w-10 h-10 rounded-full" />
                <div>
                  <div className="text-sm font-bold text-slate-900">{author.name}</div>
                  <div className="text-xs text-slate-500">{author.role}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Last updated: {article.updated || article.date}</div>
                </div>
              </div>
            )}
          </div>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify([
                {
                  "@context": "https://schema.org",
                  "@type": "BlogPosting",
                  "headline": article.title,
                  "description": article.metaDescription,
                  "image": article.image ? `${SITE}${article.image}` : `${SITE}/opengraph-image`,
                  "mainEntityOfPage": `${SITE}/blog/${slug}`,
                  "datePublished": new Date(article.date).toISOString(),
                  "dateModified": new Date(article.updated || article.date).toISOString(),
                  "author": [{
                    "@type": "Person",
                    "name": author?.name || "Rishab Jain",
                    "url": author?.url || `${SITE}/about`
                  }],
                  "publisher": {
                    "@type": "Organization",
                    "name": "EzzySync",
                    "logo": { "@type": "ImageObject", "url": `${SITE}/logo.png` }
                  }
                },
                ...(article.faqs?.length ? [{
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  "mainEntity": article.faqs.map((f) => ({
                    "@type": "Question",
                    "name": f.q,
                    "acceptedAnswer": { "@type": "Answer", "text": f.a }
                  }))
                }] : []),
                {
                  "@context": "https://schema.org",
                  "@type": "BreadcrumbList",
                  "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE}/` },
                    { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${SITE}/blog` },
                    { "@type": "ListItem", "position": 3, "name": article.title, "item": `${SITE}/blog/${slug}` }
                  ]
                }
              ])
            }}
          />

          {/* Article Banner Cover Image */}
          {article.image && (
            <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
              <Image src={article.image} alt={article.title} fill priority sizes="(max-width: 740px) 100vw, 700px" className="object-cover" />
            </div>
          )}

          {/* Article Body */}
          <div className="mt-8">
            {article.source === "md" ? (
              <div className="prose-blog" dangerouslySetInnerHTML={{ __html: article.html }} />
            ) : (
              article.content
            )}
          </div>

          {/* Free Tool & Contact Money-Page CTAs (Glox Rule #23) */}
          <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-brand-50 to-orange-50 border border-brand-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <h3 className="text-lg font-bold text-slate-900">Try Our Free AI Itinerary Generator</h3>
              <p className="text-sm text-slate-600">Create branded, day-wise itineraries in 30 seconds for your clients with zero sign-up.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link
                href="/free-itinerary-builder"
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold text-center transition-colors shadow-sm"
              >
                Use Itinerary Builder Free
              </Link>
              <Link
                href="/contact"
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 text-sm font-semibold text-center transition-colors shadow-xs"
              >
                Talk to Team
              </Link>
            </div>
          </div>

          {productPages.length > 0 && (
            <nav aria-label="Related product pages" className="mt-12">
              <h3 className="text-sm font-semibold text-slate-500">See how EzzySync handles this</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {productPages.map((href) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="inline-block px-3.5 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:border-brand-400 hover:text-brand-700"
                    >
                      {linkLabel(href)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Related Articles Cross-Linking (Glox Rule #24: Eliminate orphan pages) */}
          <div className="mt-16 pt-10 border-t border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Related Guides for Travel Agencies</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/blog/${rel.slug}`}
                  className="p-4 rounded-xl border border-slate-200 hover:border-brand-500 bg-white hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100 w-fit inline-block">
                      {rel.category}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-2">
                      {rel.title}
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400 mt-3 flex items-center gap-1 font-medium group-hover:text-brand-600">
                    Read Guide &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer crmUrl={crmUrl} />
    </div>
  );
}

import overrides from "@/content/seoOverrides.json";

/**
 * Applies title / description overrides written by the weekly SEO job
 * (content/seoOverrides.json, keyed by path) on top of a page's own
 * metadata, including its Open Graph and Twitter copies.
 *
 *   export const metadata = withSeo("/pricing", { title: ..., description: ... });
 */
export function withSeo(path, metadata) {
  const o = overrides[path];
  if (!o) return metadata;
  const title = o.title || metadata.title;
  const description = o.description || metadata.description;
  return {
    ...metadata,
    title,
    description,
    ...(metadata.openGraph && { openGraph: { ...metadata.openGraph, title, description } }),
    ...(metadata.twitter && { twitter: { ...metadata.twitter, title, description } }),
  };
}

/** Last date the job changed a page's title/description, for sitemap lastmod. */
export const overrideDate = (path) => overrides[path]?.updated;

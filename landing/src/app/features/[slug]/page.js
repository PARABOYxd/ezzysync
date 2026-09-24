import { notFound } from "next/navigation";
import SeoLandingPage, { seoPageMetadata } from "@/components/seo/SeoLandingPage";
import { featurePages, getFeaturePage } from "@/content/seoPages";

export const dynamicParams = false;

export function generateStaticParams() {
  return featurePages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = getFeaturePage(slug);
  return page ? seoPageMetadata(page, "features") : {};
}

export default async function Page({ params }) {
  const { slug } = await params;
  const page = getFeaturePage(slug);
  if (!page) notFound();
  return <SeoLandingPage page={page} kind="features" />;
}

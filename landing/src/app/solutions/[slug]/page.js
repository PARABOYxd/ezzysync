import { notFound } from "next/navigation";
import SeoLandingPage, { seoPageMetadata } from "@/components/seo/SeoLandingPage";
import { solutionPages, getSolutionPage } from "@/content/seoPages";

export const dynamicParams = false;

export function generateStaticParams() {
  return solutionPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = getSolutionPage(slug);
  return page ? seoPageMetadata(page, "solutions") : {};
}

export default async function Page({ params }) {
  const { slug } = await params;
  const page = getSolutionPage(slug);
  if (!page) notFound();
  return <SeoLandingPage page={page} kind="solutions" />;
}

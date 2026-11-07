import { Suspense } from "react";
import { notFound } from "next/navigation";
import PublicSite from "@/features/website/components/PublicSite";
import { loadPublicSite } from "@/lib/website/data";
import { Skeleton } from "@/components/ui/skeleton";

async function Site({ params }) {
  const { slug } = await params;
  const site = await loadPublicSite(slug);
  if (!site) notFound();
  const seo = site.website.seo ?? {};
  return (
    <>
      <title>{seo.title || site.name}</title>
      {seo.description ? <meta name="description" content={seo.description} /> : null}
      <PublicSite site={site} />
    </>
  );
}

export default function PublicSitePage({ params }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl space-y-4 px-6 py-16"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-64 w-full" /></div>}>
      <Site params={params} />
    </Suspense>
  );
}

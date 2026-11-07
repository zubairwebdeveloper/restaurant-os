import WebsiteEditor from "@/features/website/components/WebsiteEditor";
import { loadSiteSettings } from "@/lib/website/data";

export const metadata = { title: "Website" };

export default async function WebsitePage() {
  const { tenantName, branding, website, published } = await loadSiteSettings();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Website</h1>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">Write your site content, then publish it at your own web address.</p>
      <div className="mt-8">
        <WebsiteEditor tenantName={tenantName} branding={branding} initialWebsite={website} published={published} />
      </div>
    </div>
  );
}

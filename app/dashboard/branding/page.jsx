import BrandingEditor from "@/features/website/components/BrandingEditor";
import { loadSiteSettings } from "@/lib/website/data";

export const metadata = { title: "Branding" };

export default async function BrandingPage() {
  const { tenantName, branding, website } = await loadSiteSettings();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Branding</h1>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">Choose a template, colour and typography. The preview updates as you change them.</p>
      <div className="mt-8">
        <BrandingEditor tenantName={tenantName} initialBranding={branding} website={website} />
      </div>
    </div>
  );
}

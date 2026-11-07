import PublicSite from "./PublicSite";

/** Framed live preview used by both editors. Scrolls inside its own box. */
export default function SitePreview({ site }) {
  return (
    <section aria-label="Website preview" className="min-w-0">
      <p className="mb-2 text-sm font-medium">Preview</p>
      <div className="h-[70vh] overflow-auto rounded-lg border border-border bg-background">
        <PublicSite site={site} preview />
      </div>
    </section>
  );
}

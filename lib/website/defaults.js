import { FONT_PAIRINGS, defaultHours, getTemplate } from "@/config/restaurant-templates";
import { normalizeHex } from "@/lib/utils/color";

/** Fills gaps so editors and previews always get a complete, well-typed object. */
export function withSiteDefaults(tenant) {
  const b = tenant?.branding ?? {};
  const w = tenant?.website ?? {};
  const template = getTemplate(b.template);
  return {
    branding: {
      template: template.id,
      fontPairing: FONT_PAIRINGS[b.fontPairing] ? b.fontPairing : template.fontPairing,
      primaryColor: normalizeHex(b.primaryColor) ?? template.defaultPrimary,
      tagline: b.tagline ?? "",
    },
    website: {
      slug: w.slug ?? "",
      hero: { headline: "", subheadline: "", ctaLabel: "", ctaUrl: "", ...w.hero },
      about: { title: "", body: "", ...w.about },
      contact: { phone: "", email: "", address: "", mapUrl: "", ...w.contact },
      hours: Array.isArray(w.hours) && w.hours.length === 7 ? w.hours : defaultHours(),
      social: { instagram: "", facebook: "", tiktok: "", website: "", whatsapp: "", ...w.social },
      seo: { title: "", description: "", ...w.seo },
    },
    published: w.published === true,
  };
}

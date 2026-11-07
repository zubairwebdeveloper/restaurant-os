/**
 * Builds the PUBLIC copy of a restaurant's site (publicProfiles/{tenantId}).
 * Only fields the owner meant to publish are included: never owner ids, the application
 * phone number, subscription data or internal status notes.
 */
export function buildPublicProfile({ tenantId, tenant, branding, website, serverTimestamp }) {
  return {
    tenantId,
    status: tenant.status,
    published: true,
    name: tenant.profile?.name ?? "Restaurant",
    slug: website.slug,
    branding: {
      template: branding.template,
      fontPairing: branding.fontPairing,
      primaryColor: branding.primaryColor,
      tagline: branding.tagline ?? "",
    },
    website: {
      hero: website.hero,
      about: website.about,
      contact: website.contact,
      hours: website.hours,
      social: website.social,
      seo: website.seo,
    },
    updatedAt: serverTimestamp,
  };
}

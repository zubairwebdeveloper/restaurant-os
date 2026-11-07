import "server-only";
import { requireTenantPermission } from "@/lib/auth/dal";
import { getAdminDb } from "@/lib/firebase/admin";
import { slugSchema } from "@/schemas/website.schema";
import { withSiteDefaults } from "./defaults";
import { getPublicSite } from "./site-settings";

/** Settings for the editors. Verifies SETTINGS_MANAGE for the active tenant before reading. */
export async function loadSiteSettings() {
  const { access } = await requireTenantPermission("SETTINGS_MANAGE");
  const snap = await getAdminDb().doc(`tenants/${access.tenantId}`).get();
  const tenant = snap.data() ?? {};
  return { tenantName: tenant.profile?.name ?? "Restaurant", ...withSiteDefaults(tenant) };
}

/** Public, unauthenticated read. The slug comes from the URL, so it is validated before it reaches a document path. */
export async function loadPublicSite(rawSlug) {
  const parsed = slugSchema.safeParse(rawSlug);
  if (!parsed.success) return null;
  return getPublicSite(getAdminDb(), parsed.data);
}

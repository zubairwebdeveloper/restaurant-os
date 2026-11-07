"use server";

import { FieldValue } from "firebase-admin/firestore";
import { requireTenantPermission } from "@/lib/auth/dal";
import { getAdminDb } from "@/lib/firebase/admin";
import { saveSiteSettings } from "@/lib/website/site-settings";
import { toActionFailure } from "@/lib/utils/action-result";
import { brandingSchema } from "@/schemas/website.schema";

/**
 * The tenant is the caller's verified ACTIVE workspace (from the session), never a value sent by the browser.
 */
export async function saveBrandingAction(input) {
  const { session, access } = await requireTenantPermission("SETTINGS_MANAGE");
  try {
    const branding = brandingSchema.parse(input);
    await saveSiteSettings(getAdminDb(), {
      tenantId: access.tenantId, actorUid: session.user.uid, branding, serverTimestamp: FieldValue.serverTimestamp(),
    });
    return { ok: true, branding };
  } catch (error) {
    return toActionFailure(error, { SLUG_TAKEN: "That web address is already in use.", SITE_INCOMPLETE: "Complete the site before changing this." });
  }
}

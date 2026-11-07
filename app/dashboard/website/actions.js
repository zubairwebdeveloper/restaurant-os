"use server";

import { FieldValue } from "firebase-admin/firestore";
import { requireTenantPermission } from "@/lib/auth/dal";
import { getAdminDb } from "@/lib/firebase/admin";
import { saveSiteSettings, setSitePublished } from "@/lib/website/site-settings";
import { toActionFailure } from "@/lib/utils/action-result";
import { websiteSchema } from "@/schemas/website.schema";
import { z } from "zod";

const MESSAGES = {
  SLUG_TAKEN: "That web address is already in use. Choose another.",
  SLUG_REQUIRED: "Choose a web address before saving a live site.",
  SITE_INCOMPLETE: "Add a template, web address and hero headline before publishing.",
};

export async function saveWebsiteAction(input) {
  const { session, access } = await requireTenantPermission("SETTINGS_MANAGE");
  try {
    const website = websiteSchema.parse(input);
    const result = await saveSiteSettings(getAdminDb(), {
      tenantId: access.tenantId, actorUid: session.user.uid, website, serverTimestamp: FieldValue.serverTimestamp(),
    });
    return { ok: true, website, published: result.published };
  } catch (error) {
    return toActionFailure(error, MESSAGES);
  }
}

export async function setPublishedAction(input) {
  const { session, access } = await requireTenantPermission("SETTINGS_MANAGE");
  try {
    const { published } = z.object({ published: z.boolean() }).parse(input);
    const result = await setSitePublished(getAdminDb(), {
      tenantId: access.tenantId, actorUid: session.user.uid, published, serverTimestamp: FieldValue.serverTimestamp(),
    });
    return { ok: true, ...result };
  } catch (error) {
    return toActionFailure(error, MESSAGES);
  }
}

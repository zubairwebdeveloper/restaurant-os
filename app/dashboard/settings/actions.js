"use server";

import { FieldValue } from "firebase-admin/firestore";
import { requireTenantPermission } from "@/lib/auth/dal";
import { getAdminDb } from "@/lib/firebase/admin";
import { saveSettings } from "@/lib/pos/orders";
import { toActionFailure } from "@/lib/utils/action-result";
import { settingsFormSchema, settingsFromForm } from "@/schemas/pos.schema";

export async function saveSettingsAction(input) {
  const { session, access } = await requireTenantPermission("SETTINGS_MANAGE");
  try {
    const settings = settingsFromForm(settingsFormSchema.parse(input));
    await saveSettings(getAdminDb(), { tenantId: access.tenantId, actorUid: session.user.uid, settings, serverTimestamp: FieldValue.serverTimestamp() });
    return { ok: true };
  } catch (error) {
    return toActionFailure(error);
  }
}

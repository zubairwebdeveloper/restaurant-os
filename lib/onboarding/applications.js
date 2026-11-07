import { AUDIT_ACTIONS } from "@/config/platform";
import { PlatformError } from "@/lib/platform/errors";

export const MAX_APPLICATIONS_PER_OWNER = 5;

/**
 * Creates a PENDING restaurant application for the signed-in owner.
 * Server-side so duplicates can be prevented (rules alone cannot enforce "one pending at a time").
 * The platform audit entry doubles as the notification shown to platform admins.
 */
export async function submitApplication(db, { ownerUid, input, serverTimestamp }) {
  if (typeof ownerUid !== "string" || !ownerUid) throw new PlatformError("UNAUTHENTICATED", 401);

  return db.runTransaction(async (tx) => {
    const mine = await tx.get(db.collection("tenantApplications").where("ownerUid", "==", ownerUid).limit(20));
    if (mine.docs.some((d) => d.data().status === "PENDING")) throw new PlatformError("APPLICATION_ALREADY_PENDING", 409);
    if (mine.docs.length >= MAX_APPLICATIONS_PER_OWNER) throw new PlatformError("TOO_MANY_APPLICATIONS", 429);

    const ref = db.collection("tenantApplications").doc();
    tx.set(ref, {
      ownerUid,
      restaurantName: input.restaurantName,
      businessType: input.businessType,
      city: input.city,
      country: input.country,
      phone: input.phone,
      status: "PENDING",
      createdAt: serverTimestamp,
    });
    tx.set(db.collection("platformAuditLogs").doc(), {
      action: AUDIT_ACTIONS.APPLICATION_SUBMITTED,
      actorUid: ownerUid,
      targetType: "tenantApplication",
      targetId: ref.id,
      details: { restaurantName: input.restaurantName },
      createdAt: serverTimestamp,
    });
    return { applicationId: ref.id };
  });
}

export async function listOwnApplications(db, ownerUid) {
  const snap = await db.collection("tenantApplications").where("ownerUid", "==", ownerUid).limit(10).get();
  return snap.docs
    .map((d) => {
      const data = d.data();
      const created = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt ?? null);
      return {
        id: d.id,
        restaurantName: data.restaurantName,
        status: data.status,
        rejectionReason: data.rejectionReason ?? null,
        createdAt: typeof created === "string" ? created : null,
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

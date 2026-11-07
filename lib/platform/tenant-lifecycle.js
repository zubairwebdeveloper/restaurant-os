import { AUDIT_ACTIONS, REASON_MAX, TENANT_TRANSITIONS } from "@/config/platform";
import { permissionsForRole } from "@/config/permissions";
import { PlatformError } from "./errors";

/**
 * Trusted server-side tenant lifecycle. Callers MUST first verify that the actor is an
 * active SUPER_ADMIN (requirePlatformAdmin). Every operation runs in ONE Firestore
 * transaction: it either fully happens or not at all, and repeating it is safe.
 *
 * `db`/`auth` are Admin SDK instances (injected for testing); `serverTimestamp` is a
 * FieldValue.serverTimestamp() sentinel.
 */

function cleanReason(reason, { required }) {
  const text = typeof reason === "string" ? reason.trim() : "";
  if (required && text.length === 0) throw new PlatformError("REASON_REQUIRED", 400);
  return text.slice(0, REASON_MAX);
}

function platformAudit(db, tx, { action, actorUid, targetType, targetId, details, serverTimestamp }) {
  tx.set(db.collection("platformAuditLogs").doc(), {
    action, actorUid, targetType, targetId, details: details ?? {}, createdAt: serverTimestamp,
  });
}

/**
 * Approves a PENDING application: creates the tenant, the OWNER membership and the audit
 * entries atomically, then marks the application APPROVED.
 * Idempotent: approving an already-approved application returns the same tenantId and writes nothing.
 */
export async function approveApplication(db, auth, { applicationId, adminUid, serverTimestamp }) {
  const appRef = db.doc(`tenantApplications/${applicationId}`);
  const newTenantRef = db.collection("tenants").doc(); // id generated once, server-side

  // The owner must exist in Firebase Auth and have a verified email.
  const preview = await appRef.get();
  if (!preview.exists) throw new PlatformError("APPLICATION_NOT_FOUND", 404);
  let owner;
  try {
    owner = await auth.getUser(preview.data().ownerUid);
  } catch {
    throw new PlatformError("OWNER_NOT_FOUND", 409);
  }
  if (!owner.emailVerified) throw new PlatformError("OWNER_EMAIL_NOT_VERIFIED", 409);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(appRef);
    if (!snap.exists) throw new PlatformError("APPLICATION_NOT_FOUND", 404);
    const application = snap.data();

    if (application.status === "APPROVED" && application.tenantId) {
      return { tenantId: application.tenantId, alreadyApproved: true };
    }
    if (application.status !== "PENDING") throw new PlatformError("APPLICATION_NOT_PENDING", 409);

    const tenantId = newTenantRef.id;
    tx.set(newTenantRef, {
      status: "ACTIVE",
      ownerUid: application.ownerUid,
      applicationId,
      profile: {
        name: application.restaurantName,
        businessType: application.businessType,
        city: application.city,
        country: application.country,
        phone: application.phone,
      },
      branding: {},
      website: {},
      settings: {},
      subscription: { planId: "starter", status: "TRIAL" },
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp,
    });
    tx.set(db.doc(`tenants/${tenantId}/members/${application.ownerUid}`), {
      uid: application.ownerUid,
      role: "OWNER",
      status: "ACTIVE",
      permissions: permissionsForRole("OWNER"),
      createdAt: serverTimestamp,
      createdBy: adminUid,
    });
    tx.update(appRef, {
      status: "APPROVED", tenantId, reviewedBy: adminUid, reviewedAt: serverTimestamp,
    });
    tx.set(db.collection(`tenants/${tenantId}/auditLogs`).doc(), {
      tenantId, action: AUDIT_ACTIONS.TENANT_CREATED, actorUid: adminUid, details: { applicationId }, createdAt: serverTimestamp,
    });
    platformAudit(db, tx, {
      action: AUDIT_ACTIONS.APPLICATION_APPROVED, actorUid: adminUid, targetType: "tenantApplication",
      targetId: applicationId, details: { tenantId, ownerUid: application.ownerUid }, serverTimestamp,
    });
    return { tenantId, alreadyApproved: false };
  });
}

/** Rejects a PENDING application with a recorded reason. Repeating it is a no-op. */
export async function rejectApplication(db, { applicationId, adminUid, reason, serverTimestamp }) {
  const text = cleanReason(reason, { required: true });
  const appRef = db.doc(`tenantApplications/${applicationId}`);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(appRef);
    if (!snap.exists) throw new PlatformError("APPLICATION_NOT_FOUND", 404);
    const { status } = snap.data();
    if (status === "REJECTED") return { alreadyRejected: true };
    if (status !== "PENDING") throw new PlatformError("APPLICATION_NOT_PENDING", 409);

    tx.update(appRef, { status: "REJECTED", rejectionReason: text, reviewedBy: adminUid, reviewedAt: serverTimestamp });
    platformAudit(db, tx, {
      action: AUDIT_ACTIONS.APPLICATION_REJECTED, actorUid: adminUid, targetType: "tenantApplication",
      targetId: applicationId, details: { reason: text }, serverTimestamp,
    });
    return { alreadyRejected: false };
  });
}

/**
 * Suspends or reactivates a tenant. Suspension takes effect on the next request: security
 * rules and the server session both require tenant.status == "ACTIVE".
 * Also hides/shows the public website profile and public menu when they exist.
 */
export async function changeTenantStatus(db, { tenantId, action, adminUid, reason, serverTimestamp }) {
  const rule = TENANT_TRANSITIONS[action];
  if (!rule) throw new PlatformError("INVALID_ACTION", 400);
  const text = cleanReason(reason, { required: action === "SUSPEND" });

  const tenantRef = db.doc(`tenants/${tenantId}`);
  const publicRef = db.doc(`publicProfiles/${tenantId}`);
  const menuRef = db.doc(`publicMenus/${tenantId}`);

  return db.runTransaction(async (tx) => {
    const [tenantSnap, publicSnap, menuSnap] = await Promise.all([tx.get(tenantRef), tx.get(publicRef), tx.get(menuRef)]);
    if (!tenantSnap.exists) throw new PlatformError("TENANT_NOT_FOUND", 404);

    const current = tenantSnap.data().status;
    if (current === rule.to) return { status: current, unchanged: true }; // idempotent
    if (!rule.from.includes(current)) throw new PlatformError("INVALID_TRANSITION", 409);

    tx.update(tenantRef, {
      status: rule.to, statusReason: text, statusChangedBy: adminUid, statusChangedAt: serverTimestamp, updatedAt: serverTimestamp,
    });
    if (publicSnap.exists) tx.update(publicRef, { status: rule.to });
    if (menuSnap.exists) tx.update(menuRef, { status: rule.to });
    tx.set(db.collection(`tenants/${tenantId}/auditLogs`).doc(), {
      tenantId, action: action === "SUSPEND" ? AUDIT_ACTIONS.TENANT_SUSPENDED : AUDIT_ACTIONS.TENANT_REACTIVATED,
      actorUid: adminUid, details: { reason: text }, createdAt: serverTimestamp,
    });
    platformAudit(db, tx, {
      action: action === "SUSPEND" ? AUDIT_ACTIONS.TENANT_SUSPENDED : AUDIT_ACTIONS.TENANT_REACTIVATED,
      actorUid: adminUid, targetType: "tenant", targetId: tenantId, details: { reason: text, from: current, to: rule.to }, serverTimestamp,
    });
    return { status: rule.to, unchanged: false };
  });
}

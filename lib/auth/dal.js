import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { AuthorizationError, verifyTenantAccess } from "@/lib/security/tenant-access";
import { requirePlatformAdmin } from "@/lib/security/authorization";
import { SESSION_COOKIE, TENANT_COOKIE } from "./constants";
import { buildMembershipViews, resolveActiveTenantId } from "./memberships";

/**
 * Data Access Layer. The single place server components read the signed-in user.
 * Never cached across requests, so suspension, role changes and revoked sessions
 * take effect on the very next request.
 *
 * Call inside a <Suspense> boundary (Cache Components forbids reading cookies in the static shell).
 */
export const getSession = cache(async () => {
  const jar = await cookies();
  const sessionCookie = jar.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  let decoded;
  try {
    decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true); // true = check revocation
  } catch {
    return null;
  }

  const db = getAdminDb();
  const uid = decoded.uid;

  const [platformSnap, memberSnap] = await Promise.all([
    db.doc(`platformUsers/${uid}`).get(),
    db.collectionGroup("members").where("uid", "==", uid).limit(25).get(),
  ]);

  const platform = platformSnap.exists ? platformSnap.data() : null;
  const platformRole = platform?.status === "ACTIVE" ? platform.role : null;

  const memberDocs = memberSnap.docs.filter((d) => d.ref.parent.parent?.parent?.id === "tenants");
  const tenantSnaps = await Promise.all(memberDocs.map((d) => d.ref.parent.parent.get()));
  const memberships = buildMembershipViews(
    memberDocs.map((d, i) => ({
      tenantId: d.ref.parent.parent.id,
      member: d.data(),
      tenant: tenantSnaps[i].exists ? tenantSnaps[i].data() : null,
    })),
  );

  const activeTenantId = resolveActiveTenantId(memberships, jar.get(TENANT_COOKIE)?.value);

  return {
    user: {
      uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified === true,
      name: decoded.name ?? null,
    },
    platformRole,
    memberships,
    activeTenantId,
  };
});

/** Redirects to /login when signed out and to /verify-email when the address is unverified. */
export async function requireSession({ requireVerifiedEmail = true } = {}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (requireVerifiedEmail && !session.user.emailVerified) redirect("/verify-email");
  return session;
}

/**
 * Re-verifies tenant access against Firestore for the active workspace.
 * Use at the top of every server component, route handler or action that touches tenant data.
 */
export async function requireTenantPermission(permission) {
  const session = await requireSession();
  if (!session.activeTenantId) redirect("/dashboard/forbidden");
  try {
    const access = await verifyTenantAccess(getAdminDb(), {
      uid: session.user.uid,
      tenantId: session.activeTenantId,
      permission,
    });
    return { session, access };
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/dashboard/forbidden");
    throw error;
  }
}

export async function requirePlatformAdminSession() {
  const session = await requireSession();
  try {
    await requirePlatformAdmin(getAdminDb(), session.user.uid);
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/dashboard/forbidden");
    throw error;
  }
  return session;
}

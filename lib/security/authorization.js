import { PLATFORM_ROLES } from "@/config/permissions";
import { AuthorizationError } from "./tenant-access";

/** Server-side platform admin check (Admin SDK bypasses rules, so verify explicitly). */
export async function requirePlatformAdmin(db, uid, allowedRoles = PLATFORM_ROLES) {
  if (typeof uid !== "string" || uid.length === 0) throw new AuthorizationError("UNAUTHENTICATED", 401);
  const snap = await db.doc(`platformUsers/${uid}`).get();
  if (!snap.exists) throw new AuthorizationError("FORBIDDEN", 403);
  const user = snap.data();
  if (user.status !== "ACTIVE" || !allowedRoles.includes(user.role)) {
    throw new AuthorizationError("FORBIDDEN", 403);
  }
  return { uid, role: user.role };
}

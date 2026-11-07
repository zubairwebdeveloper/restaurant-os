import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE } from "./constants";

/**
 * Temporary Data Access Layer
 * Admin and tenant authorization disabled during development.
 */
export const getSession = cache(async () => {
  const jar = await cookies();
  const sessionCookie = jar.get(SESSION_COOKIE)?.value;

  if (!sessionCookie) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(
      sessionCookie,
      true,
    );

    return {
      user: {
        uid: decoded.uid,
        email: decoded.email ?? null,
        emailVerified: decoded.email_verified === true,
        name: decoded.name ?? null,
      },
      platformRole: null,
      memberships: [],
      activeTenantId: null,
    };
  } catch {
    return null;
  }
});

/**
 * Require authenticated session.
 */
export async function requireSession({ requireVerifiedEmail = false } = {}) {
  return {
    user: {
      uid: "temporary-dev-user",
      email: "dev@example.com",
      emailVerified: true,
      name: "Development User",
    },
    platformRole: "SUPER_ADMIN",
    memberships: [],
    activeTenantId: null,
  };
}

/**
 * Temporary tenant permission bypass.
 */
export async function requireTenantPermission(permission) {
  const session = await requireSession();

  return {
    session,
    access: {
      uid: session.user.uid,
      permissions: ["*"],
      role: "TEMPORARY_ADMIN",
      tenantId: null,
    },
  };
}

/**
 * Temporary permission bypass.
 */
export async function requireAnyTenantPermission(permissions) {
  return requireTenantPermission(permissions);
}

/**
 * Temporary platform admin bypass.
 */
export async function requirePlatformAdminSession() {
  return requireSession();
}

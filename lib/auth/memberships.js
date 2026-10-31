/**
 * Pure helpers for turning raw Firestore documents into the membership view used by
 * the dashboard. Only ACTIVE memberships in ACTIVE tenants are ever returned.
 */
export function buildMembershipViews(candidates) {
  const views = [];
  for (const { tenantId, member, tenant } of candidates) {
    if (!tenant || tenant.status !== "ACTIVE") continue;
    if (!member || member.status !== "ACTIVE") continue;
    views.push({
      tenantId,
      tenantName: typeof tenant.profile?.name === "string" && tenant.profile.name ? tenant.profile.name : "Restaurant",
      role: member.role,
      permissions: Array.isArray(member.permissions) ? [...member.permissions] : [],
    });
  }
  return views.sort((a, b) => a.tenantName.localeCompare(b.tenantName));
}

/**
 * Picks the active workspace. A preferred id (from the cookie) is honoured ONLY if it
 * is one of the user's verified memberships; otherwise the first membership is used.
 */
export function resolveActiveTenantId(memberships, preferredTenantId) {
  if (!Array.isArray(memberships) || memberships.length === 0) return null;
  const match = memberships.find((m) => m.tenantId === preferredTenantId);
  return (match ?? memberships[0]).tenantId;
}

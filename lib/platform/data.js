import "server-only";
import { requirePlatformAdminSession } from "@/lib/auth/dal";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import * as queries from "./queries";

/**
 * Page-facing data functions. Each one re-verifies the platform admin itself, because
 * layouts do not re-run on client navigation and must never be the only check.
 * (requirePlatformAdminSession is de-duplicated within a request.)
 */
export async function loadOverview() {
  await requirePlatformAdminSession();
  return queries.getPlatformOverview(getAdminDb());
}

export async function loadTenants() {
  await requirePlatformAdminSession();
  return queries.listTenants(getAdminDb(), getAdminAuth());
}

export async function loadApplications() {
  await requirePlatformAdminSession();
  return queries.listApplications(getAdminDb(), getAdminAuth());
}

export async function loadAuditLogs() {
  await requirePlatformAdminSession();
  return queries.listAuditLogs(getAdminDb());
}

import { toSerializable } from "@/lib/utils/serialize";

/**
 * Read models for the platform dashboard. Callers must already have verified a platform admin
 * (lib/platform/data.js does this). Timestamps are converted to ISO strings for the client.
 */

const LIST_LIMIT = 200;
const AUTH_BATCH = 100; // Admin getUsers accepts at most 100 identifiers per call

async function count(query) {
  const snap = await query.count().get();
  return snap.data().count;
}

export async function getPlatformOverview(db) {
  const tenants = db.collection("tenants");
  const [total, active, suspended, pendingApplications] = await Promise.all([
    count(tenants),
    count(tenants.where("status", "==", "ACTIVE")),
    count(tenants.where("status", "==", "SUSPENDED")),
    count(db.collection("tenantApplications").where("status", "==", "PENDING")),
  ]);
  const recent = await db.collection("platformAuditLogs").orderBy("createdAt", "desc").limit(8).get();
  return {
    totals: { total, active, suspended, pendingApplications },
    recentActivity: recent.docs.map((d) => toSerializable({ id: d.id, ...d.data() })),
  };
}

/** Looks up owner emails/names in Firebase Auth (batched). Missing accounts simply have no entry. */
export async function loadOwners(auth, uids) {
  const unique = [...new Set(uids.filter(Boolean))];
  const owners = new Map();
  for (let i = 0; i < unique.length; i += AUTH_BATCH) {
    const batch = unique.slice(i, i + AUTH_BATCH);
    const result = await auth.getUsers(batch.map((uid) => ({ uid })));
    for (const user of result.users) owners.set(user.uid, { email: user.email ?? null, name: user.displayName ?? null });
  }
  return owners;
}

export function joinTenantRows(docs, owners) {
  return docs.map((d) => {
    const data = d.data();
    const owner = owners.get(data.ownerUid);
    return toSerializable({
      id: d.id,
      name: data.profile?.name ?? "Unnamed restaurant",
      status: data.status,
      planId: data.subscription?.planId ?? null,
      city: data.profile?.city ?? null,
      country: data.profile?.country ?? null,
      ownerUid: data.ownerUid ?? null,
      ownerEmail: owner?.email ?? null,
      ownerName: owner?.name ?? null,
      statusReason: data.statusReason ?? null,
      createdAt: data.createdAt ?? null,
    });
  });
}

export async function listTenants(db, auth) {
  const snap = await db.collection("tenants").orderBy("createdAt", "desc").limit(LIST_LIMIT).get();
  const owners = await loadOwners(auth, snap.docs.map((d) => d.data().ownerUid));
  return joinTenantRows(snap.docs, owners);
}

export function joinApplicationRows(docs, owners) {
  return docs.map((d) => {
    const data = d.data();
    const owner = owners.get(data.ownerUid);
    return toSerializable({
      id: d.id,
      restaurantName: data.restaurantName,
      businessType: data.businessType,
      city: data.city,
      country: data.country,
      phone: data.phone,
      status: data.status,
      ownerUid: data.ownerUid,
      ownerEmail: owner?.email ?? null,
      ownerName: owner?.name ?? null,
      tenantId: data.tenantId ?? null,
      rejectionReason: data.rejectionReason ?? null,
      createdAt: data.createdAt ?? null,
    });
  });
}

export async function listApplications(db, auth) {
  const snap = await db.collection("tenantApplications").orderBy("createdAt", "desc").limit(LIST_LIMIT).get();
  const owners = await loadOwners(auth, snap.docs.map((d) => d.data().ownerUid));
  return joinApplicationRows(snap.docs, owners);
}

export async function listAuditLogs(db) {
  const snap = await db.collection("platformAuditLogs").orderBy("createdAt", "desc").limit(100).get();
  return snap.docs.map((d) => toSerializable({ id: d.id, ...d.data() }));
}

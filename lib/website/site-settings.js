import { AUDIT_ACTIONS } from "@/config/platform";
import { PlatformError } from "@/lib/platform/errors";
import { publishReadiness } from "@/schemas/website.schema";
import { buildPublicProfile } from "./public-profile";

/**
 * Trusted server-side website settings. Callers MUST first run requireTenantPermission("SETTINGS_MANAGE")
 * and validate input with the Zod schemas. Each operation is one transaction.
 *
 * - tenants/{id}.branding / .website hold the owner's saved settings (draft or live).
 * - publicProfiles/{id} is the public copy, present only while the site is published.
 * - tenantSlugs/{slug} reserves the public address for one tenant at a time.
 */

const slugRef = (db, slug) => db.doc(`tenantSlugs/${slug}`);

async function loadActiveTenant(tx, tenantRef) {
  const snap = await tx.get(tenantRef);
  if (!snap.exists) throw new PlatformError("TENANT_NOT_FOUND", 404);
  const tenant = snap.data();
  if (tenant.status !== "ACTIVE") throw new PlatformError("TENANT_NOT_ACTIVE", 403);
  return tenant;
}

async function assertSlugFree(tx, db, slug, tenantId) {
  const snap = await tx.get(slugRef(db, slug));
  if (snap.exists && snap.data().tenantId !== tenantId) throw new PlatformError("SLUG_TAKEN", 409);
}

function auditEntry(db, tx, tenantId, action, actorUid, serverTimestamp) {
  tx.set(db.collection(`tenants/${tenantId}/auditLogs`).doc(), { tenantId, action, actorUid, details: {}, createdAt: serverTimestamp });
}

/** Saves branding and/or website content. If the site is live, the public copy is refreshed in the same transaction. */
export async function saveSiteSettings(db, { tenantId, actorUid, branding, website, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  return db.runTransaction(async (tx) => {
    const tenant = await loadActiveTenant(tx, tenantRef);
    const nextBranding = branding ?? tenant.branding ?? {};
    const wasPublished = tenant.website?.published === true;
    const nextWebsite = { ...(website ?? tenant.website ?? {}), published: wasPublished };
    const oldSlug = tenant.website?.slug;

    if (wasPublished) {
      if (!nextWebsite.slug) throw new PlatformError("SLUG_REQUIRED", 400);
      if (!nextBranding.template) throw new PlatformError("SITE_INCOMPLETE", 409);
      await assertSlugFree(tx, db, nextWebsite.slug, tenantId);
    }

    tx.update(tenantRef, { branding: nextBranding, website: nextWebsite, updatedAt: serverTimestamp });
    if (wasPublished) {
      tx.set(slugRef(db, nextWebsite.slug), { tenantId, updatedAt: serverTimestamp });
      if (oldSlug && oldSlug !== nextWebsite.slug) tx.delete(slugRef(db, oldSlug)); // release the previous address
      tx.set(db.doc(`publicProfiles/${tenantId}`), buildPublicProfile({ tenantId, tenant, branding: nextBranding, website: nextWebsite, serverTimestamp }));
    }
    auditEntry(db, tx, tenantId, AUDIT_ACTIONS.SITE_SETTINGS_UPDATED, actorUid, serverTimestamp);
    return { published: wasPublished };
  });
}

/** Publishes or unpublishes the public website. Publishing reserves the slug; unpublishing releases it. */
export async function setSitePublished(db, { tenantId, actorUid, published, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  return db.runTransaction(async (tx) => {
    const tenant = await loadActiveTenant(tx, tenantRef);
    const branding = tenant.branding ?? {};
    const website = tenant.website ?? {};
    const slug = website.slug;

    if (published) {
      const readiness = publishReadiness(branding, website);
      if (!readiness.ready) throw new PlatformError("SITE_INCOMPLETE", 409, `Missing: ${readiness.missing.join(", ")}`);
      await assertSlugFree(tx, db, slug, tenantId);
      const live = { ...website, published: true };
      tx.update(tenantRef, { website: live, updatedAt: serverTimestamp });
      tx.set(slugRef(db, slug), { tenantId, updatedAt: serverTimestamp });
      tx.set(db.doc(`publicProfiles/${tenantId}`), buildPublicProfile({ tenantId, tenant, branding, website: live, serverTimestamp }));
      auditEntry(db, tx, tenantId, AUDIT_ACTIONS.SITE_PUBLISHED, actorUid, serverTimestamp);
      return { published: true, slug };
    }

    const slugSnap = slug ? await tx.get(slugRef(db, slug)) : null;
    tx.update(tenantRef, { website: { ...website, published: false }, updatedAt: serverTimestamp });
    tx.delete(db.doc(`publicProfiles/${tenantId}`));
    if (slugSnap?.exists && slugSnap.data().tenantId === tenantId) tx.delete(slugRef(db, slug));
    auditEntry(db, tx, tenantId, AUDIT_ACTIONS.SITE_UNPUBLISHED, actorUid, serverTimestamp);
    return { published: false };
  });
}

/** Reads the public site for a slug. Returns null unless it is live and its tenant is ACTIVE. */
export async function getPublicSite(db, slug) {
  const slugSnap = await db.doc(`tenantSlugs/${slug}`).get();
  if (!slugSnap.exists) return null;
  const tenantId = slugSnap.data().tenantId;
  const profileSnap = await db.doc(`publicProfiles/${tenantId}`).get();
  if (!profileSnap.exists) return null;
  const profile = profileSnap.data();
  if (profile.status !== "ACTIVE" || profile.published !== true || profile.slug !== slug) return null;
  const menuSnap = await db.doc(`publicMenus/${tenantId}`).get();
  const menuDoc = menuSnap.exists ? menuSnap.data() : null;
  const menu = menuDoc && menuDoc.status === "ACTIVE" ? { currency: menuDoc.currency, categories: menuDoc.categories } : null;
  return { name: profile.name, slug: profile.slug, branding: profile.branding, website: profile.website, menu };
}

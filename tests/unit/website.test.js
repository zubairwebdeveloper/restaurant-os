import { describe, it, expect } from "vitest";
import { DAYS, FONT_PAIRINGS, TEMPLATES, TEMPLATE_IDS, defaultHours, getTemplate } from "@/config/restaurant-templates";
import { brandingSchema, publishReadiness, slugSchema, websiteSchema } from "@/schemas/website.schema";
import { buildPublicProfile } from "@/lib/website/public-profile";
import { getPublicSite, saveSiteSettings, setSitePublished } from "@/lib/website/site-settings";
import { changeTenantStatus } from "@/lib/platform/tenant-lifecycle";
import { buildBrandStyle, contrastRatio } from "@/lib/utils/color";
import { createFakeFirestore } from "../fixtures/fake-firestore";

const TS = "SERVER_TS";
const T1 = "TenantAAAAAAAAAAAAAA";
const T2 = "TenantBBBBBBBBBBBBBB";

const branding = { template: "premium-restaurant", fontPairing: "editorial", primaryColor: "#1C2330", tagline: "Lakeside dining" };
const website = (extra = {}) => ({
  slug: "green-lagoon",
  hero: { headline: "Dine by the lake", subheadline: "Fresh and local", ctaLabel: "Reserve", ctaUrl: "" },
  about: { title: "Our story", body: "Family run since 1998." },
  contact: { phone: "+92 300 1234567", email: "hello@example.com", address: "Chashma, Mianwali", mapUrl: "" },
  hours: defaultHours(),
  social: { instagram: "", facebook: "", tiktok: "", website: "", whatsapp: "" },
  seo: { title: "Green Lagoon", description: "Lakeside dining in Chashma" },
  ...extra,
});

const seed = (extra = {}) =>
  createFakeFirestore({
    [`tenants/${T1}`]: { status: "ACTIVE", ownerUid: "owner1", profile: { name: "Green Lagoon Hotel", phone: "PRIVATE-APPLICATION-PHONE" }, subscription: { planId: "starter" }, branding, website: { ...website(), published: false } },
    [`tenants/${T2}`]: { status: "ACTIVE", ownerUid: "owner2", profile: { name: "City Cafe" }, branding, website: { ...website({ slug: "city-cafe" }), published: false } },
    ...extra,
  });
const base = { tenantId: T1, actorUid: "owner1", serverTimestamp: TS };

describe("templates", () => {
  it("every template is complete and references valid font pairings", () => {
    expect(TEMPLATE_IDS).toHaveLength(5);
    for (const t of Object.values(TEMPLATES)) {
      expect(FONT_PAIRINGS[t.fontPairing], t.id).toBeDefined();
      expect(["split", "centered", "bold"]).toContain(t.hero);
      for (const v of ["--background", "--foreground", "--surface", "--muted", "--muted-foreground", "--border"]) expect(t.vars[v], `${t.id} ${v}`).toMatch(/^#/);
    }
    expect(getTemplate("nope").id).toBe("premium-restaurant");
  });

  it("every template meets WCAG AA contrast for text and its default brand colour", () => {
    for (const t of Object.values(TEMPLATES)) {
      expect(contrastRatio(t.vars["--foreground"], t.vars["--background"]), `${t.id} fg`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.vars["--muted-foreground"], t.vars["--background"]), `${t.id} muted/bg`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.vars["--foreground"], t.vars["--surface"]), `${t.id} fg/surface`).toBeGreaterThanOrEqual(4.5);
      expect(buildBrandStyle(t.defaultPrimary).ok, `${t.id} primary`).toBe(true);
    }
  });
});

describe("slug schema", () => {
  it("accepts well-formed slugs and lowercases them", () => {
    expect(slugSchema.parse("Green-Lagoon")).toBe("green-lagoon");
    expect(slugSchema.safeParse("cafe42").success).toBe(true);
  });
  it("rejects reserved words, bad characters, bad lengths and path tricks", () => {
    for (const bad of ["admin", "api", "dashboard", "r", "ab", "-start", "end-", "has space", "dou--ble", "a/b", "../x", "x".repeat(41), "ünï", ""]) {
      expect(slugSchema.safeParse(bad).success, bad).toBe(false);
    }
  });
});

describe("branding and website schemas", () => {
  it("normalises the brand colour and rejects unreadable or invalid colours", () => {
    expect(brandingSchema.parse({ ...branding, primaryColor: "#abc" }).primaryColor).toBe("#AABBCC");
    expect(brandingSchema.safeParse({ ...branding, primaryColor: "red" }).success).toBe(false);
    expect(brandingSchema.safeParse({ ...branding, primaryColor: "#7A7A7A" }).success).toBe(false);
    expect(brandingSchema.safeParse({ ...branding, template: "fancy" }).success).toBe(false);
    expect(brandingSchema.safeParse({ ...branding, fontPairing: "comic" }).success).toBe(false);
  });

  it("accepts a full website and allows an empty draft slug", () => {
    expect(websiteSchema.safeParse(website()).success).toBe(true);
    expect(websiteSchema.safeParse(website({ slug: "" })).success).toBe(true);
  });

  it("requires https links and rejects javascript: and plain http", () => {
    for (const bad of ["javascript:alert(1)", "http://x.com", "ftp://x.com", "data:text/html,hi", "not a url"]) {
      expect(websiteSchema.safeParse(website({ social: { ...website().social, instagram: bad } })).success, bad).toBe(false);
    }
    expect(websiteSchema.safeParse(website({ social: { ...website().social, instagram: "https://instagram.com/x" } })).success).toBe(true);
  });

  it("validates hours, phone, email and text limits", () => {
    expect(websiteSchema.safeParse(website({ hours: defaultHours().slice(0, 6) })).success).toBe(false);
    expect(websiteSchema.safeParse(website({ hours: defaultHours().map((h, i) => (i === 0 ? { ...h, open: "25:00" } : h)) })).success).toBe(false);
    expect(websiteSchema.safeParse(website({ contact: { ...website().contact, phone: "call me" } })).success).toBe(false);
    expect(websiteSchema.safeParse(website({ contact: { ...website().contact, email: "nope" } })).success).toBe(false);
    expect(websiteSchema.safeParse(website({ hero: { ...website().hero, headline: "x".repeat(91) } })).success).toBe(false);
    expect(DAYS).toHaveLength(7);
  });

  it("reports what is missing before publishing", () => {
    expect(publishReadiness(branding, website()).ready).toBe(true);
    expect(publishReadiness(branding, website({ slug: "" })).missing).toContain("web address");
    expect(publishReadiness(branding, website({ hero: { ...website().hero, headline: "" } })).missing).toContain("hero headline");
  });
});

describe("buildPublicProfile", () => {
  it("contains only publishable fields and no private data", () => {
    const db = seed();
    const tenant = db._store.get(`tenants/${T1}`);
    const profile = buildPublicProfile({ tenantId: T1, tenant, branding, website: website(), serverTimestamp: TS });
    const json = JSON.stringify(profile);
    expect(json).not.toContain("owner1");
    expect(json).not.toContain("PRIVATE-APPLICATION-PHONE");
    expect(json).not.toContain("subscription");
    expect(profile).toMatchObject({ status: "ACTIVE", published: true, name: "Green Lagoon Hotel", slug: "green-lagoon" });
  });
});

describe("saveSiteSettings", () => {
  it("saves a draft without publishing or reserving the slug", async () => {
    const db = seed();
    await saveSiteSettings(db, { ...base, website: website({ slug: "new-name" }) });
    expect(db._store.get(`tenants/${T1}`).website).toMatchObject({ slug: "new-name", published: false });
    expect(db._store.has(`publicProfiles/${T1}`)).toBe(false);
    expect(db._store.has("tenantSlugs/new-name")).toBe(false);
  });

  it("merges partial saves: branding only keeps the website, website only keeps the branding", async () => {
    const db = seed();
    await saveSiteSettings(db, { ...base, branding: { ...branding, tagline: "New tagline" } });
    expect(db._store.get(`tenants/${T1}`).website.hero.headline).toBe("Dine by the lake");
    await saveSiteSettings(db, { ...base, website: website({ about: { title: "T", body: "B" } }) });
    expect(db._store.get(`tenants/${T1}`).branding.tagline).toBe("New tagline");
  });

  it("cannot flip the published flag through a save", async () => {
    const db = seed();
    await saveSiteSettings(db, { ...base, website: { ...website(), published: true } });
    expect(db._store.get(`tenants/${T1}`).website.published).toBe(false);
  });

  it("refreshes the live public copy and moves the slug when published", async () => {
    const db = seed();
    await setSitePublished(db, { ...base, published: true });
    await saveSiteSettings(db, { ...base, website: website({ slug: "lagoon-hotel", hero: { ...website().hero, headline: "New headline" } }) });
    expect(db._store.get(`publicProfiles/${T1}`).website.hero.headline).toBe("New headline");
    expect(db._store.get(`publicProfiles/${T1}`).slug).toBe("lagoon-hotel");
    expect(db._store.get("tenantSlugs/lagoon-hotel")).toMatchObject({ tenantId: T1 });
    expect(db._store.has("tenantSlugs/green-lagoon")).toBe(false); // old address released
  });

  it("refuses to take another restaurant's live address", async () => {
    const db = seed();
    await setSitePublished(db, { tenantId: T2, actorUid: "owner2", published: true, serverTimestamp: TS });
    await setSitePublished(db, { ...base, published: true });
    await expect(saveSiteSettings(db, { ...base, website: website({ slug: "city-cafe" }) })).rejects.toMatchObject({ code: "SLUG_TAKEN" });
    expect(db._store.get(`publicProfiles/${T1}`).slug).toBe("green-lagoon");
  });

  it("is rejected for non-ACTIVE or unknown tenants", async () => {
    const db = seed({ [`tenants/${T1}`]: { status: "SUSPENDED", website: {}, branding: {}, profile: {} } });
    await expect(saveSiteSettings(db, { ...base, website: website() })).rejects.toMatchObject({ code: "TENANT_NOT_ACTIVE", status: 403 });
    await expect(saveSiteSettings(seed(), { ...base, tenantId: "Missing00000000000000", website: website() })).rejects.toMatchObject({ code: "TENANT_NOT_FOUND" });
  });

  it("writes only to the caller's tenant", async () => {
    const db = seed();
    await saveSiteSettings(db, { ...base, website: website({ slug: "only-mine" }) });
    expect(db._store.get(`tenants/${T2}`).website.slug).toBe("city-cafe");
  });
});

describe("setSitePublished", () => {
  it("publishes: marks live, reserves the slug, writes the public copy and an audit entry", async () => {
    const db = seed();
    await expect(setSitePublished(db, { ...base, published: true })).resolves.toEqual({ published: true, slug: "green-lagoon" });
    expect(db._store.get(`tenants/${T1}`).website.published).toBe(true);
    expect(db._store.get("tenantSlugs/green-lagoon")).toMatchObject({ tenantId: T1 });
    expect(db._store.get(`publicProfiles/${T1}`)).toMatchObject({ published: true, status: "ACTIVE" });
    expect(db._all(`tenants/${T1}/auditLogs/`)).toHaveLength(1);
  });

  it("is idempotent", async () => {
    const db = seed();
    await setSitePublished(db, { ...base, published: true });
    await setSitePublished(db, { ...base, published: true });
    expect(db._all("tenantSlugs/")).toHaveLength(1);
  });

  it("refuses incomplete sites with a clear reason", async () => {
    const db = seed({ [`tenants/${T1}`]: { status: "ACTIVE", profile: { name: "X" }, branding, website: { ...website({ slug: "" }), published: false } } });
    await expect(setSitePublished(db, { ...base, published: true })).rejects.toMatchObject({ code: "SITE_INCOMPLETE" });
    expect(db._all("publicProfiles/")).toHaveLength(0);
  });

  it("two restaurants racing for the same address: exactly one wins", async () => {
    const db = seed({ [`tenants/${T2}`]: { status: "ACTIVE", ownerUid: "owner2", profile: { name: "City Cafe" }, branding, website: { ...website(), published: false } } });
    const results = await Promise.allSettled([
      setSitePublished(db, { ...base, published: true }),
      setSitePublished(db, { tenantId: T2, actorUid: "owner2", published: true, serverTimestamp: TS }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected").reason).toMatchObject({ code: "SLUG_TAKEN" });
    expect(db._all("publicProfiles/")).toHaveLength(1);
  });

  it("unpublishes: removes the public copy and releases the address for others", async () => {
    const db = seed();
    await setSitePublished(db, { ...base, published: true });
    await setSitePublished(db, { ...base, published: false });
    expect(db._store.has(`publicProfiles/${T1}`)).toBe(false);
    expect(db._store.has("tenantSlugs/green-lagoon")).toBe(false);
    expect(db._store.get(`tenants/${T1}`).website.published).toBe(false);
    await saveSiteSettings(db, { tenantId: T2, actorUid: "owner2", website: website({ slug: "green-lagoon" }), serverTimestamp: TS });
    await expect(setSitePublished(db, { tenantId: T2, actorUid: "owner2", published: true, serverTimestamp: TS })).resolves.toMatchObject({ published: true });
  });
});

describe("getPublicSite", () => {
  it("returns the live site, and nothing for unknown, unpublished or suspended sites", async () => {
    const db = seed();
    expect(await getPublicSite(db, "green-lagoon")).toBeNull(); // not published yet
    await setSitePublished(db, { ...base, published: true });
    const site = await getPublicSite(db, "green-lagoon");
    expect(site).toMatchObject({ name: "Green Lagoon Hotel", slug: "green-lagoon" });
    expect(JSON.stringify(site)).not.toContain("owner1");
    expect(await getPublicSite(db, "no-such-site")).toBeNull();

    await changeTenantStatus(db, { tenantId: T1, action: "SUSPEND", adminUid: "root", reason: "Policy breach", serverTimestamp: TS });
    expect(await getPublicSite(db, "green-lagoon")).toBeNull(); // hidden while suspended
    await changeTenantStatus(db, { tenantId: T1, action: "REACTIVATE", adminUid: "root", serverTimestamp: TS });
    expect(await getPublicSite(db, "green-lagoon")).not.toBeNull();
  });

  it("does not serve a profile whose slug no longer matches the reservation", async () => {
    const db = seed({ "tenantSlugs/stale": { tenantId: T1 }, [`publicProfiles/${T1}`]: { status: "ACTIVE", published: true, slug: "different" } });
    expect(await getPublicSite(db, "stale")).toBeNull();
  });
});

describe("withSiteDefaults", () => {
  it("fills every field for a brand-new tenant", async () => {
    const { withSiteDefaults } = await import("@/lib/website/defaults");
    const d = withSiteDefaults({});
    expect(d.published).toBe(false);
    expect(d.website.hours).toHaveLength(7);
    expect(d.branding).toMatchObject({ template: "premium-restaurant", primaryColor: "#1C2330" });
    expect(websiteSchema.safeParse(d.website).success).toBe(true);
    expect(brandingSchema.safeParse(d.branding).success).toBe(true);
  });

  it("keeps saved values and repairs invalid ones", async () => {
    const { withSiteDefaults } = await import("@/lib/website/defaults");
    const d = withSiteDefaults({ branding: { template: "fast-food", fontPairing: "comic", primaryColor: "nope" }, website: { slug: "x-y", published: true, hero: { headline: "Hi" } } });
    expect(d.branding).toMatchObject({ template: "fast-food", fontPairing: "bold", primaryColor: "#C62828" });
    expect(d.website).toMatchObject({ slug: "x-y", hero: { headline: "Hi", subheadline: "" } });
    expect(d.published).toBe(true);
  });
});

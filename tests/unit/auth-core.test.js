import { describe, it, expect } from "vitest";
import {
  createSessionCookieFromIdToken, isRecentSignIn, isSameOriginRequest, safeRedirectPath, sessionCookieOptions,
} from "@/lib/auth/session-core";
import { buildMembershipViews, resolveActiveTenantId } from "@/lib/auth/memberships";
import { passwordStrength } from "@/lib/auth/password";
import { GENERIC_AUTH_ERROR, mapAuthError } from "@/lib/auth/errors";
import {
  forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, activeTenantRequestSchema,
} from "@/schemas/auth.schema";

const NOW = 1_800_000_000_000;
const TOKEN = "x".repeat(40);

function fakeAdminAuth({ authTime = NOW / 1000 - 10, verifyError } = {}) {
  const calls = { cookie: [] };
  return {
    calls,
    verifyIdToken: async (_t, checkRevoked) => {
      calls.checkRevoked = checkRevoked;
      if (verifyError) throw verifyError;
      return { uid: "u1", auth_time: authTime };
    },
    createSessionCookie: async (_t, opts) => {
      calls.cookie.push(opts);
      return "session-cookie-value";
    },
  };
}

describe("createSessionCookieFromIdToken", () => {
  it("issues a cookie for a fresh, verified token and checks revocation", async () => {
    const auth = fakeAdminAuth();
    const r = await createSessionCookieFromIdToken(auth, TOKEN, { nowMs: NOW });
    expect(r).toMatchObject({ cookie: "session-cookie-value", uid: "u1" });
    expect(auth.calls.checkRevoked).toBe(true);
    expect(auth.calls.cookie[0].expiresIn).toBeGreaterThan(0);
  });

  it("rejects stale sign-ins (stolen old token)", async () => {
    const auth = fakeAdminAuth({ authTime: NOW / 1000 - 3600 });
    await expect(createSessionCookieFromIdToken(auth, TOKEN, { nowMs: NOW })).rejects.toMatchObject({
      status: 401, code: "RECENT_SIGNIN_REQUIRED",
    });
    expect(auth.calls.cookie).toHaveLength(0);
  });

  it("rejects invalid or malformed tokens without issuing a cookie", async () => {
    await expect(createSessionCookieFromIdToken(fakeAdminAuth(), "short", { nowMs: NOW })).rejects.toMatchObject({ status: 400 });
    await expect(createSessionCookieFromIdToken(fakeAdminAuth(), null, { nowMs: NOW })).rejects.toMatchObject({ status: 400 });
    const bad = fakeAdminAuth({ verifyError: new Error("revoked") });
    await expect(createSessionCookieFromIdToken(bad, TOKEN, { nowMs: NOW })).rejects.toMatchObject({ status: 401, code: "INVALID_TOKEN" });
    expect(bad.calls.cookie).toHaveLength(0);
  });
});

describe("isRecentSignIn", () => {
  it("needs a numeric auth_time within the window", () => {
    expect(isRecentSignIn({ auth_time: NOW / 1000 - 60 }, NOW)).toBe(true);
    expect(isRecentSignIn({ auth_time: NOW / 1000 - 600 }, NOW)).toBe(false);
    expect(isRecentSignIn({ auth_time: NOW / 1000 + 3600 }, NOW)).toBe(false);
    expect(isRecentSignIn({}, NOW)).toBe(false);
    expect(isRecentSignIn(null, NOW)).toBe(false);
  });
});

describe("sessionCookieOptions", () => {
  it("is httpOnly, lax, and secure in production", () => {
    expect(sessionCookieOptions({ isProduction: true })).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    expect(sessionCookieOptions({ isProduction: false }).secure).toBe(false);
  });
});

describe("isSameOriginRequest", () => {
  it("accepts matching Origin and same-origin fetch metadata", () => {
    expect(isSameOriginRequest({ origin: "https://app.example.com", host: "app.example.com" })).toBe(true);
    expect(isSameOriginRequest({ origin: null, host: "x", secFetchSite: "same-origin" })).toBe(true);
  });
  it("rejects cross-site, malformed and header-less requests", () => {
    expect(isSameOriginRequest({ origin: "https://evil.com", host: "app.example.com" })).toBe(false);
    expect(isSameOriginRequest({ origin: "not a url", host: "app.example.com" })).toBe(false);
    expect(isSameOriginRequest({ origin: null, host: "x", secFetchSite: "cross-site" })).toBe(false);
    expect(isSameOriginRequest({ origin: null, host: "x" })).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it("keeps safe internal paths", () => {
    expect(safeRedirectPath("/dashboard/orders?x=1#top")).toBe("/dashboard/orders?x=1#top");
  });
  it("blocks open redirects and loops", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "evil", "", null, "/login", "/api/auth/session", "/register?x=1"]) {
      expect(safeRedirectPath(bad)).toBe("/dashboard");
    }
    expect(safeRedirectPath("/x".repeat(400))).toBe("/dashboard");
  });
});

describe("memberships", () => {
  const T = (status, name) => ({ status, profile: { name } });
  const M = (status, role = "OWNER") => ({ status, role, permissions: ["POS_READ"] });

  it("returns only ACTIVE memberships in ACTIVE tenants, sorted by name", () => {
    const views = buildMembershipViews([
      { tenantId: "b", member: M("ACTIVE"), tenant: T("ACTIVE", "Zebra Grill") },
      { tenantId: "a", member: M("ACTIVE"), tenant: T("ACTIVE", "Alpha Cafe") },
      { tenantId: "c", member: M("SUSPENDED"), tenant: T("ACTIVE", "Suspended Member") },
      { tenantId: "d", member: M("ACTIVE"), tenant: T("SUSPENDED", "Suspended Tenant") },
      { tenantId: "e", member: M("ACTIVE"), tenant: T("PENDING", "Pending") },
      { tenantId: "f", member: M("ACTIVE"), tenant: null },
    ]);
    expect(views.map((v) => v.tenantId)).toEqual(["a", "b"]);
  });

  it("falls back to safe defaults for malformed data", () => {
    const [v] = buildMembershipViews([{ tenantId: "a", member: { status: "ACTIVE", role: "STAFF" }, tenant: { status: "ACTIVE" } }]);
    expect(v).toMatchObject({ tenantName: "Restaurant", permissions: [] });
  });

  it("only honours a preferred tenant that is a verified membership", () => {
    const list = [{ tenantId: "a" }, { tenantId: "b" }];
    expect(resolveActiveTenantId(list, "b")).toBe("b");
    expect(resolveActiveTenantId(list, "attacker-tenant")).toBe("a");
    expect(resolveActiveTenantId(list, undefined)).toBe("a");
    expect(resolveActiveTenantId([], "a")).toBeNull();
  });
});

describe("password strength and errors", () => {
  it("scores passwords sensibly", () => {
    expect(passwordStrength("").score).toBe(0);
    expect(passwordStrength("short1").score).toBeLessThanOrEqual(1);
    expect(passwordStrength("Password12345").score).toBeLessThanOrEqual(1);
    expect(passwordStrength("Tr1cky-Horse-Battery!").score).toBe(4);
  });
  it("maps Firebase errors to safe messages", () => {
    expect(mapAuthError({ code: "auth/invalid-credential" })).toMatch(/Incorrect email or password/);
    expect(mapAuthError({ code: "auth/user-not-found" })).toBe(mapAuthError({ code: "auth/wrong-password" }));
    expect(mapAuthError({ code: "weird" })).toBe(GENERIC_AUTH_ERROR);
    expect(mapAuthError(null)).toBe(GENERIC_AUTH_ERROR);
  });
});

describe("auth schemas", () => {
  const good = { name: "Ayesha Khan", email: " Ayesha@Example.COM ", password: "Sunrise2026x", confirmPassword: "Sunrise2026x" };

  it("normalises email and accepts a valid registration", () => {
    const r = registerSchema.safeParse(good);
    expect(r.success).toBe(true);
    expect(r.data.email).toBe("ayesha@example.com");
  });
  it("enforces the password policy and confirmation", () => {
    expect(registerSchema.safeParse({ ...good, password: "short1", confirmPassword: "short1" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...good, password: "alllettersonly", confirmPassword: "alllettersonly" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...good, password: "1234567890123", confirmPassword: "1234567890123" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...good, confirmPassword: "different1234" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: "Sunrise2026x", confirmPassword: "Sunrise2026y" }).success).toBe(false);
  });
  it("validates login, forgot-password and tenant selection payloads", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    expect(activeTenantRequestSchema.safeParse({ tenantId: "../../etc" }).success).toBe(false);
    expect(activeTenantRequestSchema.safeParse({ tenantId: "AAAAAAAAAAAAAAAAAAAA" }).success).toBe(true);
  });
});

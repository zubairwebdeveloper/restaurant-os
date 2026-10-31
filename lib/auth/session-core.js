import { AuthorizationError } from "@/lib/security/tenant-access";
import { RECENT_SIGNIN_SECONDS, SESSION_MAX_AGE_MS } from "./constants";

/** True when the ID token came from a sign-in within the last few minutes. */
export function isRecentSignIn(decoded, nowMs = Date.now()) {
  const authTime = decoded?.auth_time;
  if (typeof authTime !== "number") return false;
  const age = nowMs / 1000 - authTime;
  return age >= -60 && age <= RECENT_SIGNIN_SECONDS; // small clock-skew allowance
}

/**
 * Exchanges a fresh Firebase ID token for a server-managed session cookie.
 * `adminAuth` is the Admin SDK Auth instance (injected so this stays unit-testable).
 * The token is verified AND checked for revocation before a cookie is issued.
 */
export async function createSessionCookieFromIdToken(adminAuth, idToken, { nowMs = Date.now(), maxAgeMs = SESSION_MAX_AGE_MS } = {}) {
  if (typeof idToken !== "string" || idToken.length < 20 || idToken.length > 4096) {
    throw new AuthorizationError("INVALID_TOKEN", 400);
  }
  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken, true);
  } catch {
    throw new AuthorizationError("INVALID_TOKEN", 401);
  }
  if (!isRecentSignIn(decoded, nowMs)) throw new AuthorizationError("RECENT_SIGNIN_REQUIRED", 401);
  const cookie = await adminAuth.createSessionCookie(idToken, { expiresIn: maxAgeMs });
  return { cookie, uid: decoded.uid, maxAgeMs };
}

/** Cookie attributes. httpOnly keeps the session out of reach of page scripts. */
export function sessionCookieOptions({ isProduction, maxAgeMs = SESSION_MAX_AGE_MS }) {
  return {
    httpOnly: true,
    secure: Boolean(isProduction),
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

/**
 * CSRF defence for cookie-authenticated POST/DELETE handlers: accept only same-origin browser requests.
 * Strict on purpose: requests with neither Origin nor Sec-Fetch-Site are rejected.
 */
export function isSameOriginRequest({ origin, host, secFetchSite }) {
  if (origin) {
    try {
      return Boolean(host) && new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  return secFetchSite === "same-origin" || secFetchSite === "none";
}

/** Prevents open redirects: only same-site relative paths, never auth pages or APIs. */
export function safeRedirectPath(next, fallback = "/dashboard") {
  if (typeof next !== "string" || next.length === 0 || next.length > 512) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  let url;
  try {
    url = new URL(next, "http://local.invalid");
  } catch {
    return fallback;
  }
  if (url.origin !== "http://local.invalid") return fallback;
  const blocked = ["/login", "/register", "/api", "/verify-email", "/forgot-password", "/reset-password"];
  if (blocked.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

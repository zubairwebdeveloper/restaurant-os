export const SESSION_COOKIE = "ros_session"; // Firebase session cookie (httpOnly)
export const TENANT_COOKIE = "ros_tenant"; // selected workspace, validated on every request
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days (Firebase allows 5 min - 14 days)
export const RECENT_SIGNIN_SECONDS = 5 * 60; // an ID token must come from a sign-in within 5 minutes

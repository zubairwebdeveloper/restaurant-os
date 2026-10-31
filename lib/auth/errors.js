/** Maps Firebase Auth error codes to safe, user-facing messages. */
const MESSAGES = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
  "auth/weak-password": "Choose a stronger password (at least 10 characters with letters and numbers).",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
  "auth/user-disabled": "This account has been disabled. Contact support.",
  "auth/network-request-failed": "Network problem. Check your connection and try again.",
  "auth/expired-action-code": "This link has expired. Request a new one.",
  "auth/invalid-action-code": "This link is invalid or has already been used. Request a new one.",
  "auth/requires-recent-login": "Please sign in again to continue.",
};

export const GENERIC_AUTH_ERROR = "Something went wrong. Please try again.";

export function mapAuthError(error) {
  const code = typeof error?.code === "string" ? error.code : "";
  return MESSAGES[code] ?? GENERIC_AUTH_ERROR;
}

import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getFirebaseApp } from "./client";

/**
 * Optional App Check (client). Enabled only when NEXT_PUBLIC_FIREBASE_APPCHECK_KEY is set.
 * NOT yet verified end-to-end; enforcement must be enabled in the Firebase console
 * only after testing, otherwise legitimate traffic will be rejected.
 */
let initialised = false;
export function initAppCheck() {
  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_KEY;
  if (initialised || !siteKey || typeof window === "undefined") return;
  initializeAppCheck(getFirebaseApp(), {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  initialised = true;
}

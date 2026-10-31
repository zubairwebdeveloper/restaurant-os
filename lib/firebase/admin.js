import "server-only";
import { applicationDefault, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK (server only). It BYPASSES Security Rules, so callers must
 * run verifyTenantAccess()/requirePlatformAdmin() before reading or writing tenant data.
 *
 * Credentials come from environment variables, never from source control:
 *   FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
 * With the emulators (FIRESTORE_EMULATOR_HOST set) no credentials are required.
 */
function createAdminApp() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  }
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({ projectId: projectId ?? "demo-restaurant-os" });
  }
  // Falls back to Application Default Credentials (e.g. a trusted hosting environment).
  return initializeApp({ credential: applicationDefault(), projectId });
}

export function getAdminApp() {
  return getApps().length ? getApp() : createAdminApp();
}

export const getAdminAuth = () => getAuth(getAdminApp());
export const getAdminDb = () => getFirestore(getAdminApp());

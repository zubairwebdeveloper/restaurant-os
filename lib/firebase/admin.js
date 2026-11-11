import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";

// Server-only. Structure for Phase 1: nothing imports this yet.
export function getAdminApp() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;
  if (getApps().length) return getApps()[0];

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

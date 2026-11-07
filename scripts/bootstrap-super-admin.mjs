#!/usr/bin/env node
/**
 * Creates the first platform SUPER_ADMIN. Run it yourself, on a trusted machine.
 *
 *   node --env-file=.env.local scripts/bootstrap-super-admin.mjs --email you@example.com
 *
 * Requirements: the account is already registered in the app and its email is verified;
 * FIREBASE_ADMIN_PROJECT_ID / _CLIENT_EMAIL / _PRIVATE_KEY are set (or Application Default
 * Credentials). For the emulators set FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST.
 * Optional: --allow-additional to create another SUPER_ADMIN when one already exists.
 */
import { cert, applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { bootstrapSuperAdmin } from "../lib/platform/bootstrap.mjs";

const args = process.argv.slice(2);
const emailIndex = args.indexOf("--email");
const email = emailIndex >= 0 ? args[emailIndex + 1] : undefined;
const allowAdditional = args.includes("--allow-additional");

if (!email) {
  console.error("Usage: node --env-file=.env.local scripts/bootstrap-super-admin.mjs --email you@example.com");
  process.exit(1);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const app =
  projectId && clientEmail && privateKey
    ? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId })
    : initializeApp({ credential: usingEmulator ? undefined : applicationDefault(), projectId: projectId ?? "demo-restaurant-os" });

console.log(`Project: ${projectId ?? "(default)"}${usingEmulator ? "  [EMULATOR]" : ""}`);

try {
  const result = await bootstrapSuperAdmin(getFirestore(app), getAuth(app), {
    email,
    serverTimestamp: FieldValue.serverTimestamp(),
    allowAdditional,
  });
  console.log(result.created ? `Created SUPER_ADMIN for uid ${result.uid}.` : `No change: ${result.uid} is already a SUPER_ADMIN.`);
} catch (error) {
  console.error(`Failed: ${error.message}`);
  process.exit(1);
}

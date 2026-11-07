#!/usr/bin/env node
/**
 * Brings every membership's stored `permissions` array in line with the role bundles in
 * config/permissions.js. Run it after adding or changing permissions (Firestore rules and
 * server checks read the stored array), because existing members keep the list they were created with.
 *
 *   node --env-file=.env.local scripts/sync-member-permissions.mjs           # dry run: prints what would change
 *   node --env-file=.env.local scripts/sync-member-permissions.mjs --apply   # writes the changes
 *
 * Needs Node 22.7+ (it loads the ES module config directly) and Admin credentials or the emulators.
 */
import { cert, applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { permissionsForRole } from "../config/permissions.js";

const apply = process.argv.includes("--apply");
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const app =
  projectId && clientEmail && privateKey
    ? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId })
    : initializeApp({ credential: usingEmulator ? undefined : applicationDefault(), projectId: projectId ?? "demo-restaurant-os" });
const db = getFirestore(app);

console.log(`Project: ${projectId ?? "(default)"}${usingEmulator ? "  [EMULATOR]" : ""}   mode: ${apply ? "APPLY" : "DRY RUN"}`);

try {
const snap = await db.collectionGroup("members").get();
let changed = 0;
let skipped = 0;
for (const doc of snap.docs) {
  if (doc.ref.parent.parent?.parent?.id !== "tenants") continue;
  const { role, permissions = [] } = doc.data();
  const expected = permissionsForRole(role);
  if (expected.length === 0) { skipped++; console.log(`  skip ${doc.ref.path}: unknown role ${role}`); continue; }
  const same = expected.length === permissions.length && expected.every((p) => permissions.includes(p));
  if (same) continue;
  changed++;
  const added = expected.filter((p) => !permissions.includes(p));
  const removed = permissions.filter((p) => !expected.includes(p));
  console.log(`  ${doc.ref.path} (${role}): +[${added.join(", ")}] -[${removed.join(", ")}]`);
  if (apply) await doc.ref.update({ permissions: expected, permissionsSyncedAt: FieldValue.serverTimestamp() });
}
console.log(`${changed} membership(s) ${apply ? "updated" : "would change"}, ${skipped} skipped.`);
if (!apply && changed > 0) console.log("Run again with --apply to write the changes.");
} catch (error) {
  console.error(`Failed: ${error.message}`);
  process.exit(1);
}

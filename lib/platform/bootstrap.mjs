/**
 * Creates the FIRST platform SUPER_ADMIN. Dependency-free so the command-line script
 * (scripts/bootstrap-super-admin.mjs) and the unit tests can both use it.
 *
 * Safety rules:
 *  - the account must already exist in Firebase Auth with a VERIFIED email;
 *  - it refuses to create a second SUPER_ADMIN unless allowAdditional is set;
 *  - re-running it for the same account changes nothing;
 *  - the check-and-create happens in one transaction, and an audit log is written.
 * Public registration can never reach this code: only an operator with Admin credentials runs it.
 */
export async function bootstrapSuperAdmin(db, auth, { email, serverTimestamp, allowAdditional = false }) {
  if (typeof email !== "string" || !email.includes("@")) throw new Error("A valid --email is required.");

  let user;
  try {
    user = await auth.getUserByEmail(email.trim().toLowerCase());
  } catch (error) {
    if (error?.code === "auth/user-not-found") {
      throw new Error("No Firebase Auth account exists for that email. Register it in the app first.");
    }
    throw error; // credentials, network or project problems must not be disguised as "not found"
  }
  if (!user.emailVerified) throw new Error("That account's email is not verified. Verify it, then run this again.");

  return db.runTransaction(async (tx) => {
    const existing = await tx.get(db.collection("platformUsers").where("role", "==", "SUPER_ADMIN").limit(5));
    const active = existing.docs.filter((d) => d.data().status === "ACTIVE");

    if (active.some((d) => d.id === user.uid)) return { created: false, uid: user.uid, reason: "ALREADY_SUPER_ADMIN" };
    if (active.length > 0 && !allowAdditional) {
      throw new Error("A SUPER_ADMIN already exists. Use the platform tools to add admins, or pass --allow-additional deliberately.");
    }

    tx.set(db.doc(`platformUsers/${user.uid}`), {
      uid: user.uid,
      email: user.email ?? email,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      createdAt: serverTimestamp,
      createdBy: "bootstrap",
    });
    tx.set(db.collection("platformAuditLogs").doc(), {
      action: "SUPER_ADMIN_BOOTSTRAPPED",
      actorUid: "bootstrap",
      targetType: "platformUser",
      targetId: user.uid,
      details: { email: user.email ?? email },
      createdAt: serverTimestamp,
    });
    return { created: true, uid: user.uid };
  });
}

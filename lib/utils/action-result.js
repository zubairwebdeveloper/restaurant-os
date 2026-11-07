import { AuthorizationError } from "@/lib/security/tenant-access";
import { PlatformError } from "@/lib/platform/errors";

const DEFAULT_MESSAGES = {
  TENANT_NOT_ACTIVE: "Your restaurant workspace is not active.",
  TENANT_NOT_FOUND: "Restaurant not found.",
};

/** Turns any thrown error into a safe { ok: false, error } result for the client. */
export function toActionFailure(error, messages = {}) {
  const table = { ...DEFAULT_MESSAGES, ...messages };
  if (error instanceof AuthorizationError) return { ok: false, error: "You do not have permission to do this." };
  if (error instanceof PlatformError) return { ok: false, error: table[error.code] ?? "Request could not be completed." };
  if (error?.name === "ZodError") return { ok: false, error: error.issues?.[0]?.message ?? "Invalid input." };
  console.error("Action failed:", error?.code ?? error?.message);
  return { ok: false, error: "Something went wrong. Please try again." };
}

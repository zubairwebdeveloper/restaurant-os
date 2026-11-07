import { PlatformError } from "@/lib/platform/errors";

/** The new order must contain exactly the existing ids: no missing, extra or duplicate entries. */
export function validateOrder(existingIds, orderedIds) {
  const existing = new Set(existingIds);
  const ordered = new Set(orderedIds);
  if (ordered.size !== orderedIds.length || existing.size !== ordered.size || [...ordered].some((id) => !existing.has(id))) {
    throw new PlatformError("INVALID_ORDER", 400);
  }
}

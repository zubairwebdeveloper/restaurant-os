/**
 * Convert Firestore SDK values into plain serializable data before they reach Redux.
 * Timestamps (anything with toDate()) and Dates become ISO strings; functions are dropped.
 */
export function toSerializable(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "function") return undefined;
  if (typeof value !== "object") return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(toSerializable);
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    const converted = toSerializable(val);
    if (converted !== undefined) out[key] = converted;
  }
  return out;
}

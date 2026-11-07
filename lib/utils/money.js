/**
 * Money is stored as integer minor units (1250 = 12.50) so arithmetic never suffers
 * floating-point error. Every supported currency has 2 decimals (config/menu.js).
 */

/** "12.5" -> 1250. Returns null for anything that is not a plain non-negative amount with at most 2 decimals. */
export function parseMoneyInput(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** 1250 -> "12.50" (for form inputs). */
export function minorToInput(minor) {
  if (!Number.isInteger(minor) || minor < 0) return "";
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;
}

/** 1250, "PKR" -> "PKR 12.50". Fixed locale so server and browser agree. */
export function formatMoney(minor, currency = "PKR") {
  if (!Number.isInteger(minor)) return "";
  return `${currency} ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100)}`;
}

/** "16" -> 1600, "16.5" -> 1650 (basis points: 1 bp = 0.01%). Null unless a plain percentage with at most 2 decimals. */
export function parsePercentInput(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const bp = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return bp <= 10000 ? bp : null;
}

/** 1650 -> "16.50" (for form inputs). */
export function bpToInput(bp) {
  if (!Number.isInteger(bp) || bp < 0) return "";
  return `${Math.floor(bp / 100)}.${String(bp % 100).padStart(2, "0")}`;
}

/** amount x basis points, rounded half up, in integer arithmetic only. */
export function mulBp(amountMinor, bp) {
  return Math.floor((amountMinor * bp + 5000) / 10000);
}

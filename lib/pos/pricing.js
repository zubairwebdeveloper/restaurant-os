import { POS_LIMITS, DEFAULT_POS_SETTINGS } from "@/config/pos";
import { CURRENCIES } from "@/config/menu";
import { PlatformError } from "@/lib/platform/errors";
import { mulBp } from "@/lib/utils/money";

/**
 * THE pricing authority. The server uses it to price every order from the database menu;
 * the POS screen uses the same function only to PREVIEW totals. Clients never send prices.
 * Integer minor units throughout; rounding is half-up and happens at each documented step.
 *
 * Order of calculation:
 *   subtotal  = sum of line totals
 *   discount  = percentage (basis points) or fixed amount of the subtotal, never above it
 *   service   = service charge % of (subtotal - discount)
 *   tax       = tax % of (subtotal - discount + service)
 *   total     = subtotal - discount + service + tax        (prices are tax-exclusive)
 */

function priceLine(line, product, index) {
  if (!product) throw new PlatformError("PRODUCT_NOT_FOUND", 404, `line ${index + 1}`);
  if (product.available === false) throw new PlatformError("ITEM_UNAVAILABLE", 409, product.name);

  const variants = product.variants ?? [];
  let variant = null;
  if (variants.length > 0) {
    if (!line.variantId) throw new PlatformError("VARIANT_REQUIRED", 400, product.name);
    variant = variants.find((v) => v.id === line.variantId);
    if (!variant) throw new PlatformError("INVALID_VARIANT", 400, product.name);
  } else if (line.variantId) {
    throw new PlatformError("INVALID_VARIANT", 400, product.name);
  }

  const groups = product.modifierGroups ?? [];
  const selections = line.selections ?? [];
  const seenGroups = new Set();
  for (const sel of selections) {
    if (seenGroups.has(sel.groupId) || !groups.some((g) => g.id === sel.groupId)) throw new PlatformError("INVALID_MODIFIER", 400, product.name);
    seenGroups.add(sel.groupId);
  }

  const modifiers = [];
  let unit = variant ? variant.priceMinor : product.priceMinor;
  for (const group of groups) {
    const chosen = selections.find((s) => s.groupId === group.id)?.optionIds ?? [];
    if (new Set(chosen).size !== chosen.length) throw new PlatformError("INVALID_MODIFIER", 400, product.name);
    if (chosen.length < group.min) throw new PlatformError("MODIFIER_REQUIRED", 400, `${product.name}: ${group.name}`);
    if (chosen.length > group.max) throw new PlatformError("MODIFIER_LIMIT", 400, `${product.name}: ${group.name}`);
    const options = chosen.map((id) => {
      const option = group.options.find((o) => o.id === id);
      if (!option) throw new PlatformError("INVALID_MODIFIER", 400, product.name);
      return { id: option.id, name: option.name, priceMinor: option.priceMinor };
    });
    if (options.length > 0) {
      modifiers.push({ groupId: group.id, groupName: group.name, options });
      unit += options.reduce((sum, o) => sum + o.priceMinor, 0);
    }
  }

  return {
    lineId: String(index + 1),
    productId: product.id,
    name: product.name,
    categoryId: product.categoryId ?? null,
    variantId: variant?.id ?? null,
    variantName: variant?.name ?? null,
    modifiers,
    unitPriceMinor: unit,
    quantity: line.quantity,
    lineTotalMinor: unit * line.quantity,
    note: line.note ?? "",
  };
}

export function computeDiscount(subtotalMinor, discount) {
  if (!discount) return 0;
  if (discount.type === "PERCENT") return Math.min(subtotalMinor, mulBp(subtotalMinor, discount.value));
  if (discount.type === "FIXED") return Math.min(subtotalMinor, discount.value);
  throw new PlatformError("INVALID_DISCOUNT", 400);
}

/** products: Map(productId -> product incl. id). Returns { lines, totals }. Throws PlatformError. */
export function priceOrder({ lines, products, settings, discount }) {
  const cfg = readPosSettings(settings);
  const priced = lines.map((line, i) => priceLine(line, products.get(line.productId), i));
  const subtotalMinor = priced.reduce((sum, l) => sum + l.lineTotalMinor, 0);
  const discountMinor = computeDiscount(subtotalMinor, discount);
  const taxable = subtotalMinor - discountMinor;
  const serviceChargeMinor = mulBp(taxable, cfg.serviceBp);
  const taxMinor = mulBp(taxable + serviceChargeMinor, cfg.taxBp);
  const totalMinor = taxable + serviceChargeMinor + taxMinor;
  if (totalMinor > POS_LIMITS.MAX_ORDER_TOTAL_MINOR) throw new PlatformError("ORDER_TOO_LARGE", 400);
  return { lines: priced, totals: { subtotalMinor, discountMinor, serviceChargeMinor, taxMinor, totalMinor }, settings: cfg };
}

/** Defensive read of tenant settings: anything missing or out of range falls back to the safe default (no tax). */
export function readPosSettings(raw) {
  const d = DEFAULT_POS_SETTINGS;
  const s = raw ?? {};
  const bp = (v, max) => (Number.isInteger(v) && v >= 0 && v <= max ? v : 0);
  const text = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
  return {
    currency: CURRENCIES.includes(s.currency) ? s.currency : d.currency,
    taxBp: bp(s.taxBp, POS_LIMITS.MAX_TAX_BP),
    serviceBp: bp(s.serviceBp, POS_LIMITS.MAX_SERVICE_BP),
    taxLabel: text(s.taxLabel, 20) || d.taxLabel,
    taxRegistration: text(s.taxRegistration, 40),
    receiptFooter: text(s.receiptFooter, 200),
  };
}

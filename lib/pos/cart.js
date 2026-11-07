import { PlatformError } from "@/lib/platform/errors";
import { parseMoneyInput, parsePercentInput } from "@/lib/utils/money";
import { priceOrder } from "./pricing";

/** Cart discount text -> { type, value } as the server expects (basis points or minor units), or null. */
export function parseDiscount(discount) {
  if (!discount || discount.type === "NONE") return null;
  const value = discount.type === "PERCENT" ? parsePercentInput(discount.value) : parseMoneyInput(discount.value);
  if (value === null || value <= 0) return { type: discount.type, value: 0, reason: discount.reason ?? "", invalid: true };
  return { type: discount.type, value, reason: discount.reason ?? "" };
}

/** The ONLY thing sent to the server: ids, quantities and text. No prices, no totals. */
export function buildOrderInput(cart) {
  const discount = parseDiscount(cart.discount);
  return {
    type: cart.orderType,
    tableLabel: cart.orderType === "DINE_IN" ? cart.tableLabel : "",
    customer: cart.orderType === "DELIVERY" || cart.orderType === "TAKEAWAY" ? cart.customer : { name: "", phone: "", address: "" },
    lines: cart.lines.map((l) => ({
      productId: l.productId,
      ...(l.variantId ? { variantId: l.variantId } : {}),
      selections: l.selections.map((s) => ({ groupId: s.groupId, optionIds: [...s.optionIds] })),
      quantity: l.quantity,
      note: l.note,
    })),
    discount: discount ? { type: discount.type, value: discount.value, reason: discount.reason } : null,
    note: cart.note,
  };
}

/**
 * Preview of what the order will cost, using the SAME pricing function as the server.
 * It is only for display: the server prices again from the database and its result is final.
 */
export function estimateCart(cart, products, settings) {
  if (cart.lines.length === 0) return { ok: true, totals: { subtotalMinor: 0, discountMinor: 0, serviceChargeMinor: 0, taxMinor: 0, totalMinor: 0 }, lines: [] };
  const discount = parseDiscount(cart.discount);
  try {
    const input = buildOrderInput(cart);
    const priced = priceOrder({
      lines: input.lines,
      products: new Map(products.map((p) => [p.id, p])),
      settings,
      discount: discount && !discount.invalid ? discount : null,
    });
    return { ok: true, ...priced };
  } catch (error) {
    return { ok: false, error: error instanceof PlatformError ? error.code : "UNKNOWN" };
  }
}

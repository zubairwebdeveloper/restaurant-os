import { describe, it, expect } from "vitest";
import { buildOrderInput, estimateCart, parseDiscount } from "@/lib/pos/cart";
import { buildPayments, splitEqually } from "@/lib/pos/payment-form";
import { orderInputSchema } from "@/schemas/pos.schema";
import { priceOrder } from "@/lib/pos/pricing";

const KARAHI = "ProdKarahiAAAAAAAAAA";
const PIZZA = "ProdPizzaAAAAAAAAAAA";
const products = [
  { id: KARAHI, name: "Karahi", priceMinor: 125000, available: true, variants: [], modifierGroups: [] },
  { id: PIZZA, name: "Pizza", priceMinor: 90000, available: true, variants: [{ id: "variant-large", name: "Large", priceMinor: 150000 }], modifierGroups: [{ id: "group-crust-aa", name: "Crust", min: 1, max: 1, options: [{ id: "opt-thick-01", name: "Thick", priceMinor: 2000 }] }] },
];
const cart = (over = {}) => ({
  lines: [{ lineId: "x", productId: KARAHI, name: "Karahi", variantId: null, selections: [], quantity: 2, note: "", unitPriceMinor: 999 }],
  orderType: "TAKEAWAY", tableLabel: "T9", customer: { name: "", phone: "", address: "" },
  discount: { type: "NONE", value: "", reason: "" }, note: "", clientOrderId: null, ...over,
});

describe("buildOrderInput", () => {
  it("sends only ids, quantities and text: never prices or totals", () => {
    const input = buildOrderInput(cart());
    expect(JSON.stringify(input)).not.toMatch(/price|total|999/i);
    expect(input.lines[0]).toEqual({ productId: KARAHI, selections: [], quantity: 2, note: "" });
    expect(orderInputSchema.safeParse(input).success).toBe(true);
  });
  it("only keeps the fields relevant to the order type", () => {
    expect(buildOrderInput(cart({ orderType: "TAKEAWAY" })).tableLabel).toBe("");
    expect(buildOrderInput(cart({ orderType: "DINE_IN" })).tableLabel).toBe("T9");
    expect(buildOrderInput(cart({ orderType: "DINE_IN", customer: { name: "A", phone: "1", address: "x" } })).customer).toEqual({ name: "", phone: "", address: "" });
  });
  it("includes variants and modifier selections", () => {
    const input = buildOrderInput(cart({ lines: [{ lineId: "y", productId: PIZZA, variantId: "variant-large", selections: [{ groupId: "group-crust-aa", optionIds: ["opt-thick-01"] }], quantity: 1, note: "well done" }] }));
    expect(input.lines[0]).toMatchObject({ variantId: "variant-large", note: "well done" });
    expect(orderInputSchema.safeParse(input).success).toBe(true);
  });
});

describe("parseDiscount", () => {
  it("turns typed text into basis points or minor units", () => {
    expect(parseDiscount({ type: "PERCENT", value: "10", reason: "promo" })).toEqual({ type: "PERCENT", value: 1000, reason: "promo" });
    expect(parseDiscount({ type: "FIXED", value: "250.50", reason: "x" })).toEqual({ type: "FIXED", value: 25050, reason: "x" });
    expect(parseDiscount({ type: "NONE", value: "10" })).toBeNull();
    expect(parseDiscount(undefined)).toBeNull();
    expect(parseDiscount({ type: "PERCENT", value: "abc", reason: "" }).invalid).toBe(true);
    expect(parseDiscount({ type: "FIXED", value: "0", reason: "" }).invalid).toBe(true);
  });
});

describe("estimateCart", () => {
  it("matches the server pricing function exactly", () => {
    const settings = { taxBp: 1600, serviceBp: 500 };
    const c = cart({ discount: { type: "PERCENT", value: "10", reason: "promo" } });
    const est = estimateCart(c, products, settings);
    const server = priceOrder({ lines: buildOrderInput(c).lines, products: new Map(products.map((p) => [p.id, p])), settings, discount: { type: "PERCENT", value: 1000 } });
    expect(est.ok).toBe(true);
    expect(est.totals).toEqual(server.totals);
    expect(est.totals.subtotalMinor).toBe(250000); // the stale unit price stored on the cart line (999) is ignored
  });
  it("handles empty, invalid and unavailable carts without throwing", () => {
    expect(estimateCart(cart({ lines: [] }), products, {}).totals.totalMinor).toBe(0);
    expect(estimateCart(cart({ lines: [{ ...cart().lines[0], productId: "ProdGoneAAAAAAAAAAA" }] }), products, {})).toEqual({ ok: false, error: "PRODUCT_NOT_FOUND" });
    expect(estimateCart(cart({ lines: [{ ...cart().lines[0], productId: PIZZA }] }), products, {}).error).toBe("VARIANT_REQUIRED");
    const soldOut = products.map((p) => (p.id === KARAHI ? { ...p, available: false } : p));
    expect(estimateCart(cart(), soldOut, {}).error).toBe("ITEM_UNAVAILABLE");
  });
  it("ignores an invalid discount text instead of guessing", () => {
    const est = estimateCart(cart({ discount: { type: "PERCENT", value: "abc", reason: "" } }), products, {});
    expect(est.totals.discountMinor).toBe(0);
  });
});

describe("splitEqually", () => {
  it("always adds up exactly", () => {
    expect(splitEqually(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitEqually(10000, 4)).toEqual([2500, 2500, 2500, 2500]);
    expect(splitEqually(1, 3)).toEqual([1, 0, 0]);
    for (let total = 0; total < 300; total += 7) for (let n = 1; n <= 10; n++) expect(splitEqually(total, n).reduce((a, b) => a + b, 0)).toBe(total);
  });
  it("clamps the number of ways", () => {
    expect(splitEqually(1000, 0)).toHaveLength(1);
    expect(splitEqually(1000, 99)).toHaveLength(10);
    expect(splitEqually(1000, 2.9)).toHaveLength(2);
  });
});

describe("buildPayments", () => {
  it("builds payments, change and totals from typed rows", () => {
    const r = buildPayments([{ method: "CASH", amount: "250.00", tendered: "300" }, { method: "CARD_DEMO", amount: "100", tendered: "" }], 40000);
    expect(r).toEqual({ ok: true, payments: [{ method: "CASH", amountMinor: 25000, tenderedMinor: 30000 }, { method: "CARD_DEMO", amountMinor: 10000 }], totalMinor: 35000, changeMinor: 5000 });
  });
  it("gives readable errors for bad input and overpayment", () => {
    expect(buildPayments([], 100).ok).toBe(false);
    expect(buildPayments([{ method: "CASH", amount: "abc" }], 100000).error).toMatch(/amount/i);
    expect(buildPayments([{ method: "CASH", amount: "0" }], 100000).ok).toBe(false);
    expect(buildPayments([{ method: "BITCOIN", amount: "1" }], 100000).ok).toBe(false);
    expect(buildPayments([{ method: "CASH", amount: "100", tendered: "50" }], 100000).error).toMatch(/less/i);
    expect(buildPayments([{ method: "CASH", amount: "200" }], 10000).error).toMatch(/more than/i);
    expect(buildPayments([{ method: "CASH", amount: "1" }, { method: "CASH", amount: "bad" }], 100000).error).toMatch(/Payment 2/);
  });
});

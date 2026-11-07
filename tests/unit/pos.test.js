import { describe, it, expect } from "vitest";
import { priceOrder, readPosSettings, computeDiscount } from "@/lib/pos/pricing";
import { mulBp, parsePercentInput, bpToInput } from "@/lib/utils/money";
import { orderInputSchema, payOrderSchema, placeOrderSchema, refundOrderSchema, settingsFormSchema, settingsFromForm } from "@/schemas/pos.schema";
import { cancelOrder, payOrder, placeOrder, refundOrder, saveSettings, summarizeLedger, updateFulfilment } from "@/lib/pos/orders";
import { permissionsForRole } from "@/config/permissions";
import { POS_LIMITS } from "@/config/pos";
import { createFakeFirestore } from "../fixtures/fake-firestore";

const TS = "SERVER_TS";
const T1 = "TenantAAAAAAAAAAAAAA";
const T2 = "TenantBBBBBBBBBBBBBB";
const KARAHI = "ProdKarahiAAAAAAAAAA";
const PIZZA = "ProdPizzaAAAAAAAAAAA";
const TEA = "ProdTeaAAAAAAAAAAAAA";
const FOREIGN = "ProdForeignAAAAAAAAA";
const OID = "11111111-1111-4111-8111-111111111111";
const OID2 = "22222222-2222-4222-8222-222222222222";
const REQ = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`;

const karahi = { categoryId: "c1", name: "Chicken Karahi", priceMinor: 125000, available: true, variants: [], modifierGroups: [] };
const pizza = {
  categoryId: "c1", name: "Pizza", priceMinor: 90000, available: true,
  variants: [{ id: "variant-small", name: "Small", priceMinor: 90000 }, { id: "variant-large", name: "Large", priceMinor: 150000 }],
  modifierGroups: [
    { id: "group-toppings", name: "Toppings", min: 0, max: 2, required: false, options: [{ id: "opt-olives-1", name: "Olives", priceMinor: 5000 }, { id: "opt-cheese-1", name: "Cheese", priceMinor: 8000 }, { id: "opt-pepper-1", name: "Peppers", priceMinor: 4000 }] },
    { id: "group-crust-aa", name: "Crust", min: 1, max: 1, required: true, options: [{ id: "opt-thin-001", name: "Thin", priceMinor: 0 }, { id: "opt-thick-01", name: "Thick", priceMinor: 2000 }] },
  ],
};
const tea = { categoryId: "c2", name: "Tea", priceMinor: 20000, available: false, variants: [], modifierGroups: [] };
const productMap = (extra = {}) => new Map(Object.entries({ [KARAHI]: karahi, [PIZZA]: pizza, [TEA]: tea, ...extra }).map(([id, p]) => [id, { id, ...p }]));
const line = (productId, extra = {}) => ({ productId, quantity: 1, selections: [], note: "", ...extra });
const pizzaLine = (extra = {}) => line(PIZZA, { variantId: "variant-large", selections: [{ groupId: "group-crust-aa", optionIds: ["opt-thick-01"] }], ...extra });

describe("money helpers", () => {
  it("rounds basis points half-up with integers only", () => {
    expect(mulBp(10000, 1600)).toBe(1600);
    expect(mulBp(333, 1600)).toBe(53); // 53.28
    expect(mulBp(334, 1600)).toBe(53); // 53.44
    expect(mulBp(1, 5000)).toBe(1); // 0.5 rounds up
    expect(mulBp(0, 1600)).toBe(0);
    expect(mulBp(1_000_000_000, 5000)).toBe(500_000_000);
  });
  it("parses and prints percentages", () => {
    expect(parsePercentInput("16")).toBe(1600);
    expect(parsePercentInput("16.5")).toBe(1650);
    expect(parsePercentInput("0")).toBe(0);
    for (const bad of ["", "-1", "101", "1.234", "abc", "1,5", "1e2", null]) expect(parsePercentInput(bad), String(bad)).toBeNull();
    expect(bpToInput(1650)).toBe("16.50");
    expect(bpToInput(-1)).toBe("");
  });
});

describe("priceOrder", () => {
  const cfg = { taxBp: 0, serviceBp: 0 };
  it("prices simple, variant and modifier lines from the menu", () => {
    const r = priceOrder({ lines: [line(KARAHI, { quantity: 2 }), pizzaLine({ selections: [{ groupId: "group-toppings", optionIds: ["opt-olives-1", "opt-cheese-1"] }, { groupId: "group-crust-aa", optionIds: ["opt-thick-01"] }] })], products: productMap(), settings: cfg, discount: null });
    expect(r.lines[0]).toMatchObject({ unitPriceMinor: 125000, quantity: 2, lineTotalMinor: 250000, name: "Chicken Karahi" });
    expect(r.lines[1]).toMatchObject({ variantName: "Large", unitPriceMinor: 150000 + 2000 + 5000 + 8000 });
    expect(r.totals.subtotalMinor).toBe(250000 + 165000);
    expect(r.lines[1].modifiers.map((m) => m.groupName)).toEqual(["Toppings", "Crust"]);
  });

  it("applies service charge, then tax on (subtotal - discount + service)", () => {
    const r = priceOrder({ lines: [line(KARAHI, { quantity: 1 })], products: productMap({ [KARAHI]: { ...karahi, priceMinor: 100000 } }), settings: { taxBp: 1600, serviceBp: 500 }, discount: null });
    expect(r.totals).toEqual({ subtotalMinor: 100000, discountMinor: 0, serviceChargeMinor: 5000, taxMinor: 16800, totalMinor: 121800 });
  });

  it("discounts before service and tax, caps at the subtotal, and never goes negative", () => {
    const base = { lines: [line(KARAHI)], products: productMap(), settings: { taxBp: 1000, serviceBp: 0 } };
    expect(priceOrder({ ...base, discount: { type: "PERCENT", value: 1000 } }).totals).toMatchObject({ discountMinor: 12500, taxMinor: 11250, totalMinor: 123750 });
    expect(priceOrder({ ...base, discount: { type: "FIXED", value: 25000 } }).totals.discountMinor).toBe(25000);
    expect(priceOrder({ ...base, discount: { type: "FIXED", value: 999999999 } }).totals).toMatchObject({ discountMinor: 125000, taxMinor: 0, totalMinor: 0 });
    expect(priceOrder({ ...base, discount: { type: "PERCENT", value: 10000 } }).totals.totalMinor).toBe(0);
    expect(() => computeDiscount(100, { type: "WEIRD", value: 1 })).toThrow();
  });

  it("rejects unavailable, unknown and malformed lines", () => {
    const run = (lines, extra = {}) => () => priceOrder({ lines, products: productMap(), settings: cfg, discount: null, ...extra });
    expect(run([line(TEA)])).toThrow(/ITEM_UNAVAILABLE/);
    expect(run([line(FOREIGN)])).toThrow(/PRODUCT_NOT_FOUND/);
    expect(run([line(PIZZA, { selections: [{ groupId: "group-crust-aa", optionIds: ["opt-thin-001"] }] })])).toThrow(/VARIANT_REQUIRED/);
    expect(run([pizzaLine({ variantId: "variant-bogus" })])).toThrow(/INVALID_VARIANT/);
    expect(run([line(KARAHI, { variantId: "variant-small" })])).toThrow(/INVALID_VARIANT/);
    expect(run([pizzaLine({ selections: [] })])).toThrow(/MODIFIER_REQUIRED/); // required Crust missing
    expect(run([pizzaLine({ selections: [{ groupId: "group-crust-aa", optionIds: ["opt-thin-001", "opt-thick-01"] }] })])).toThrow(/MODIFIER_LIMIT/);
    expect(run([pizzaLine({ selections: [{ groupId: "group-crust-aa", optionIds: ["opt-thin-001"] }, { groupId: "group-toppings", optionIds: ["opt-olives-1", "opt-cheese-1", "opt-pepper-1"] }] })])).toThrow(/MODIFIER_LIMIT/);
    expect(run([pizzaLine({ selections: [{ groupId: "group-crust-aa", optionIds: ["opt-nope-0001"] }] })])).toThrow(/INVALID_MODIFIER/);
    expect(run([pizzaLine({ selections: [{ groupId: "group-crust-aa", optionIds: ["opt-thin-001"] }, { groupId: "group-crust-aa", optionIds: ["opt-thin-001"] }] })])).toThrow(/INVALID_MODIFIER/);
    expect(run([pizzaLine({ selections: [{ groupId: "group-crust-aa", optionIds: ["opt-thin-001", "opt-thin-001"] }] })])).toThrow(/INVALID_MODIFIER|MODIFIER_LIMIT/);
    expect(run([pizzaLine({ selections: [{ groupId: "group-other-01", optionIds: [] }] })])).toThrow(/INVALID_MODIFIER/);
    expect(run([line(KARAHI, { quantity: 99 })], { products: productMap({ [KARAHI]: { ...karahi, priceMinor: POS_LIMITS.MAX_ORDER_TOTAL_MINOR } }) })).toThrow(/ORDER_TOO_LARGE/);
  });

  it("falls back to safe defaults for corrupted settings (no tax)", () => {
    expect(readPosSettings({ taxBp: 999999, serviceBp: -5, currency: "XXX", taxLabel: 5 })).toMatchObject({ taxBp: 0, serviceBp: 0, currency: "PKR", taxLabel: "Tax" });
    expect(readPosSettings(undefined).taxBp).toBe(0);
    expect(readPosSettings({ taxBp: 1600, currency: "USD", taxLabel: "GST" })).toMatchObject({ taxBp: 1600, currency: "USD", taxLabel: "GST" });
  });

  it("keeps the money invariants for 500 pseudo-random orders", () => {
    let seed = 12345;
    const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    for (let i = 0; i < 500; i++) {
      const lines = Array.from({ length: 1 + rnd(5) }, () => line(KARAHI, { quantity: 1 + rnd(9) }));
      const discount = rnd(3) === 0 ? null : rnd(2) ? { type: "PERCENT", value: 1 + rnd(10000) } : { type: "FIXED", value: 1 + rnd(900000) };
      const { totals: t } = priceOrder({ lines, products: productMap({ [KARAHI]: { ...karahi, priceMinor: 1 + rnd(500000) } }), settings: { taxBp: rnd(2501), serviceBp: rnd(1501) }, discount });
      for (const v of Object.values(t)) { expect(Number.isInteger(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(0); }
      expect(t.discountMinor).toBeLessThanOrEqual(t.subtotalMinor);
      expect(t.totalMinor).toBe(t.subtotalMinor - t.discountMinor + t.serviceChargeMinor + t.taxMinor);
    }
  });
});

describe("POS schemas", () => {
  const dineIn = { type: "DINE_IN", tableLabel: "T5", lines: [{ productId: KARAHI, quantity: 2 }] };
  it("accepts valid orders and applies defaults", () => {
    const r = orderInputSchema.parse(dineIn);
    expect(r).toMatchObject({ discount: null, note: "", customer: { name: "", phone: "", address: "" } });
    expect(r.lines[0]).toMatchObject({ selections: [], note: "" });
  });
  it("never lets clients supply prices, totals, status or tenant fields", () => {
    const r = orderInputSchema.parse({ ...dineIn, totals: { totalMinor: 1 }, status: "PAID", tenantId: "x", lines: [{ productId: KARAHI, quantity: 1, priceMinor: 1, unitPriceMinor: 1 }] });
    expect(r.totals).toBeUndefined();
    expect(r.status).toBeUndefined();
    expect(r.tenantId).toBeUndefined();
    expect(r.lines[0].priceMinor).toBeUndefined();
  });
  it("enforces type-specific fields and sane quantities", () => {
    expect(orderInputSchema.safeParse({ ...dineIn, tableLabel: "" }).success).toBe(false);
    expect(orderInputSchema.safeParse({ type: "DELIVERY", lines: dineIn.lines }).success).toBe(false);
    expect(orderInputSchema.safeParse({ type: "DELIVERY", lines: dineIn.lines, customer: { name: "A", phone: "0300 1234567", address: "Street 1" } }).success).toBe(true);
    expect(orderInputSchema.safeParse({ type: "TAKEAWAY", lines: dineIn.lines }).success).toBe(true);
    for (const quantity of [0, -1, 1.5, 100, "2"]) expect(orderInputSchema.safeParse({ ...dineIn, lines: [{ productId: KARAHI, quantity }] }).success, String(quantity)).toBe(false);
    expect(orderInputSchema.safeParse({ ...dineIn, lines: [] }).success).toBe(false);
    expect(orderInputSchema.safeParse({ ...dineIn, discount: { type: "PERCENT", value: 10001, reason: "promo" } }).success).toBe(false);
    expect(orderInputSchema.safeParse({ ...dineIn, discount: { type: "FIXED", value: 0, reason: "promo" } }).success).toBe(false);
  });
  it("requires UUID idempotency keys and positive integer amounts", () => {
    expect(placeOrderSchema.safeParse({ clientOrderId: "not-a-uuid", order: dineIn }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ clientOrderId: OID, order: dineIn }).success).toBe(true);
    const pay = (payments) => payOrderSchema.safeParse({ orderId: OID, paymentRequestId: REQ(1), payments });
    expect(pay([{ method: "CASH", amountMinor: 1000 }]).success).toBe(true);
    for (const amountMinor of [0, -5, 10.5, "100"]) expect(pay([{ method: "CASH", amountMinor }]).success, String(amountMinor)).toBe(false);
    expect(pay([{ method: "BITCOIN", amountMinor: 100 }]).success).toBe(false);
    expect(pay([]).success).toBe(false);
    expect(refundOrderSchema.safeParse({ orderId: OID, refundRequestId: REQ(2), amountMinor: 100, method: "CASH", reason: "no" }).success).toBe(false);
  });
  it("settings: percentages become basis points and out-of-range values are rejected", () => {
    const form = { currency: "PKR", taxPercent: "16", servicePercent: "5.5", taxLabel: "GST", taxRegistration: "NTN 123", receiptFooter: "Thanks" };
    expect(settingsFormSchema.safeParse(form).success).toBe(true);
    expect(settingsFromForm(form)).toMatchObject({ taxBp: 1600, serviceBp: 550, taxLabel: "GST" });
    expect(settingsFromForm({ ...form, taxPercent: "", taxLabel: "" })).toMatchObject({ taxBp: 0, taxLabel: "Tax" });
    expect(settingsFormSchema.safeParse({ ...form, taxPercent: "60" }).success).toBe(false);
    expect(settingsFormSchema.safeParse({ ...form, servicePercent: "31" }).success).toBe(false);
    expect(settingsFormSchema.safeParse({ ...form, taxPercent: "abc" }).success).toBe(false);
    expect(settingsFormSchema.safeParse({ ...form, currency: "BTC" }).success).toBe(false);
  });
});

describe("new permissions", () => {
  it("only owner and manager can discount and refund", () => {
    for (const role of ["OWNER", "MANAGER"]) expect(permissionsForRole(role)).toEqual(expect.arrayContaining(["POS_DISCOUNT", "ORDERS_REFUND"]));
    for (const role of ["CASHIER", "CHEF", "WAITER", "STAFF", "INVENTORY_MANAGER", "ACCOUNTANT"]) {
      expect(permissionsForRole(role)).not.toContain("POS_DISCOUNT");
      expect(permissionsForRole(role)).not.toContain("ORDERS_REFUND");
    }
  });
});

// ---------------------------------------------------------------- order lifecycle
const seed = (extra = {}, settings = { taxBp: 1600, serviceBp: 0 }) =>
  createFakeFirestore({
    [`tenants/${T1}`]: { status: "ACTIVE", settings },
    [`tenants/${T2}`]: { status: "ACTIVE" },
    [`tenants/${T1}/products/${KARAHI}`]: karahi,
    [`tenants/${T1}/products/${PIZZA}`]: pizza,
    [`tenants/${T1}/products/${TEA}`]: tea,
    [`tenants/${T2}/products/${FOREIGN}`]: { ...karahi, name: "Foreign dish", priceMinor: 1 },
    ...extra,
  });
const base = { tenantId: T1, actorUid: "cashier1", serverTimestamp: TS };
const order = (extra = {}) => orderInputSchema.parse({ type: "TAKEAWAY", lines: [{ productId: KARAHI, quantity: 2 }], ...extra });
const place = (db, orderId = OID, input = order(), extra = {}) => placeOrder(db, { ...base, orderId, input, canDiscount: false, ...extra });
const get = (db, id = OID, t = T1) => db._store.get(`tenants/${t}/orders/${id}`);
const ledger = (db, t = T1) => db._all(`tenants/${t}/transactions/`).map((p) => db._store.get(p));
const total = 2 * 125000 + mulBp(2 * 125000, 1600); // 290000

describe("placeOrder", () => {
  it("prices from the database, snapshots names, numbers orders and audits", async () => {
    const db = seed();
    const r = await place(db);
    expect(r).toMatchObject({ orderId: OID, orderNumber: 1, totalMinor: total, alreadyExists: false });
    expect(get(db)).toMatchObject({
      tenantId: T1, status: "OPEN", paymentStatus: "UNPAID", paidMinor: 0, fulfilmentStatus: "NEW", createdBy: "cashier1", taxBp: 1600, currency: "PKR",
      totals: { subtotalMinor: 250000, taxMinor: 40000, totalMinor: total },
    });
    expect(get(db).lines[0]).toMatchObject({ name: "Chicken Karahi", unitPriceMinor: 125000, quantity: 2 });
    expect(db._all(`tenants/${T1}/auditLogs/`)).toHaveLength(1);
  });

  it("keeps the order intact when the menu changes afterwards", async () => {
    const db = seed();
    await place(db);
    db._store.set(`tenants/${T1}/products/${KARAHI}`, { ...karahi, name: "Renamed", priceMinor: 1 });
    expect(get(db).lines[0]).toMatchObject({ name: "Chicken Karahi", unitPriceMinor: 125000 });
    expect(get(db).totals.totalMinor).toBe(total);
  });

  it("numbers orders sequentially per tenant", async () => {
    const db = seed();
    expect((await place(db, OID)).orderNumber).toBe(1);
    expect((await place(db, OID2)).orderNumber).toBe(2);
    expect(db._store.get(`tenants/${T1}`).posMeta.orderCounter).toBe(2);
    expect(db._store.get(`tenants/${T2}`).posMeta).toBeUndefined();
  });

  it("is idempotent: replays return the original order and never create or renumber another", async () => {
    const db = seed();
    const first = await place(db);
    const again = await place(db);
    expect(again).toMatchObject({ orderNumber: first.orderNumber, alreadyExists: true, totalMinor: first.totalMinor });
    expect(db._all(`tenants/${T1}/orders/`)).toHaveLength(1);
    expect(db._store.get(`tenants/${T1}`).posMeta.orderCounter).toBe(1);
    expect(db._all(`tenants/${T1}/auditLogs/`)).toHaveLength(1);
  });

  it("rejects the same key with a different cart", async () => {
    const db = seed();
    await place(db);
    await expect(place(db, OID, order({ lines: [{ productId: KARAHI, quantity: 3 }] }))).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT", status: 409 });
    expect(get(db).totals.totalMinor).toBe(total);
  });

  it("double-tap: concurrent identical submissions create exactly one order", async () => {
    const db = seed();
    const results = await Promise.all(Array.from({ length: 5 }, () => place(db)));
    expect(db._all(`tenants/${T1}/orders/`)).toHaveLength(1);
    expect(results.filter((r) => !r.alreadyExists)).toHaveLength(1);
    expect(db._store.get(`tenants/${T1}`).posMeta.orderCounter).toBe(1);
  });

  it("concurrent different orders get distinct numbers with no gaps", async () => {
    const db = seed();
    const ids = Array.from({ length: 6 }, (_, i) => `33333333-3333-4333-8333-${String(i).padStart(12, "0")}`);
    const results = await Promise.all(ids.map((id) => place(db, id)));
    expect(results.map((r) => r.orderNumber).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("cannot sell another restaurant's product or an unavailable one", async () => {
    const db = seed();
    await expect(place(db, OID, order({ lines: [{ productId: FOREIGN, quantity: 1 }] }))).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
    await expect(place(db, OID, order({ lines: [{ productId: TEA, quantity: 1 }] }))).rejects.toMatchObject({ code: "ITEM_UNAVAILABLE" });
    expect(db._all(`tenants/${T1}/orders/`)).toHaveLength(0);
    expect(db._store.get(`tenants/${T1}`).posMeta).toBeUndefined(); // a failed order does not burn a number
  });

  it("enforces the discount permission on the server", async () => {
    const db = seed();
    const discounted = order({ discount: { type: "PERCENT", value: 1000, reason: "Staff meal" } });
    await expect(place(db, OID, discounted, { canDiscount: false })).rejects.toMatchObject({ code: "DISCOUNT_NOT_ALLOWED", status: 403 });
    await expect(place(db, OID, discounted, { canDiscount: true })).resolves.toBeTruthy();
    expect(get(db).discount).toMatchObject({ type: "PERCENT", amountMinor: 25000, reason: "Staff meal" });
  });

  it("is rejected for suspended or unknown tenants", async () => {
    const suspended = seed({ [`tenants/${T1}`]: { status: "SUSPENDED" } });
    await expect(place(suspended)).rejects.toMatchObject({ code: "TENANT_NOT_ACTIVE", status: 403 });
    await expect(place(seed(), OID, order(), { tenantId: "Missing00000000000000" })).rejects.toMatchObject({ code: "TENANT_NOT_FOUND" });
  });

  it("uses safe defaults when tenant settings are corrupted", async () => {
    const db = seed({}, { taxBp: 99999999, serviceBp: -1 });
    await place(db);
    expect(get(db).totals).toMatchObject({ taxMinor: 0, serviceChargeMinor: 0, totalMinor: 250000 });
  });
});

describe("payOrder", () => {
  const pay = (db, requestId, payments, orderId = OID, t = T1) => payOrder(db, { ...base, tenantId: t, orderId, paymentRequestId: requestId, payments });
  async function placed(extra) {
    const db = seed(extra);
    await place(db);
    return db;
  }

  it("settles an order in full with cash and records change", async () => {
    const db = await placed();
    const r = await pay(db, REQ(1), [{ method: "CASH", amountMinor: total, tenderedMinor: 300000 }]);
    expect(r).toMatchObject({ status: "PAID", paidMinor: total, changeMinor: 10000, alreadyProcessed: false });
    expect(get(db)).toMatchObject({ status: "PAID", paymentStatus: "PAID", paidMinor: total });
    expect(ledger(db)).toEqual([expect.objectContaining({ type: "PAYMENT", method: "CASH", demo: false, amountMinor: total, tenderedMinor: 300000, changeMinor: 10000, orderId: OID })]);
  });

  it("supports split payments across methods and across several requests", async () => {
    const db = await placed();
    await pay(db, REQ(1), [{ method: "CASH", amountMinor: 100000 }, { method: "CARD_DEMO", amountMinor: 90000 }]);
    expect(get(db)).toMatchObject({ status: "OPEN", paymentStatus: "PARTIAL", paidMinor: 190000 });
    await pay(db, REQ(2), [{ method: "WALLET_DEMO", amountMinor: total - 190000 }]);
    expect(get(db)).toMatchObject({ status: "PAID", paidMinor: total });
    expect(ledger(db).filter((e) => e.demo)).toHaveLength(2); // card + wallet are labelled demo
    expect(summarizeLedger(ledger(db))).toMatchObject({ paidMinor: total, refundedMinor: 0 });
    expect(get(db).payments.map((p) => p.method)).toEqual(["CASH", "CARD_DEMO", "WALLET_DEMO"]);
  });

  it("validates amounts on the server", async () => {
    const db = await placed();
    await expect(pay(db, REQ(1), [{ method: "CASH", amountMinor: total + 1 }])).rejects.toMatchObject({ code: "OVERPAYMENT" });
    await expect(pay(db, REQ(1), [{ method: "CASH", amountMinor: 1000 }, { method: "CARD_DEMO", amountMinor: total }])).rejects.toMatchObject({ code: "OVERPAYMENT" });
    await expect(pay(db, REQ(1), [{ method: "CASH", amountMinor: 1000, tenderedMinor: 500 }])).rejects.toMatchObject({ code: "INSUFFICIENT_TENDER" });
    await expect(pay(db, REQ(1), [{ method: "CARD_DEMO", amountMinor: 1000, tenderedMinor: 5000 }])).rejects.toMatchObject({ code: "INVALID_PAYMENT" });
    expect(ledger(db)).toHaveLength(0);
    expect(get(db).paidMinor).toBe(0);
  });

  it("is idempotent: a repeated request id records nothing twice", async () => {
    const db = await placed();
    await pay(db, REQ(1), [{ method: "CASH", amountMinor: 100000 }]);
    const again = await pay(db, REQ(1), [{ method: "CASH", amountMinor: 100000 }]);
    expect(again).toMatchObject({ alreadyProcessed: true, paidMinor: 100000 });
    expect(ledger(db)).toHaveLength(1);
    expect(get(db).paidMinor).toBe(100000);
    expect(get(db).payments).toHaveLength(1);
  });

  it("double-tap on Pay: concurrent identical requests produce one payment", async () => {
    const db = await placed();
    await Promise.all(Array.from({ length: 4 }, () => pay(db, REQ(1), [{ method: "CASH", amountMinor: total }])));
    expect(ledger(db)).toHaveLength(1);
    expect(get(db)).toMatchObject({ status: "PAID", paidMinor: total });
  });

  it("two cashiers paying in full at once: one succeeds, the other is refused as overpayment", async () => {
    const db = await placed();
    const results = await Promise.allSettled([pay(db, REQ(1), [{ method: "CASH", amountMinor: total }]), pay(db, REQ(2), [{ method: "CARD_DEMO", amountMinor: total }])]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected").reason).toMatchObject({ code: expect.stringMatching(/OVERPAYMENT|ORDER_NOT_PAYABLE/) });
    expect(ledger(db)).toHaveLength(1);
    expect(get(db).paidMinor).toBe(total);
  });

  it("refuses to pay settled or cancelled orders and unknown orders", async () => {
    const db = await placed();
    await pay(db, REQ(1), [{ method: "CASH", amountMinor: total }]);
    await expect(pay(db, REQ(2), [{ method: "CASH", amountMinor: 1 }])).rejects.toMatchObject({ code: "ORDER_NOT_PAYABLE" });
    await expect(pay(db, REQ(3), [{ method: "CASH", amountMinor: 1 }], "99999999-9999-4999-8999-999999999999")).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
    const db2 = await placed();
    await cancelOrder(db2, { ...base, orderId: OID, reason: "Customer left" });
    await expect(pay(db2, REQ(4), [{ method: "CASH", amountMinor: 1 }])).rejects.toMatchObject({ code: "ORDER_NOT_PAYABLE" });
  });

  it("a request id cannot be reused on a different order", async () => {
    const db = await placed();
    await place(db, OID2);
    await pay(db, REQ(1), [{ method: "CASH", amountMinor: 1000 }], OID);
    await expect(pay(db, REQ(1), [{ method: "CASH", amountMinor: 1000 }], OID2)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect(get(db, OID2).paidMinor).toBe(0);
  });

  it("cannot touch another tenant's orders", async () => {
    const db = await placed();
    await expect(pay(db, REQ(1), [{ method: "CASH", amountMinor: 1000 }], OID, T2)).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
    expect(ledger(db, T2)).toHaveLength(0);
  });
});

describe("cancel, refund and fulfilment", () => {
  const pay = (db, id, payments) => payOrder(db, { ...base, orderId: OID, paymentRequestId: id, payments });
  const refund = (db, id, amountMinor, extra = {}) => refundOrder(db, { ...base, orderId: OID, refundRequestId: id, amountMinor, method: "CASH", reason: "Customer complaint", ...extra });
  async function paid() {
    const db = seed();
    await place(db);
    await pay(db, REQ(1), [{ method: "CASH", amountMinor: total }]);
    return db;
  }

  it("cancels only unpaid open orders, with a reason, repeatably", async () => {
    const db = seed();
    await place(db);
    await cancelOrder(db, { ...base, orderId: OID, reason: "Wrong table" });
    expect(get(db)).toMatchObject({ status: "CANCELLED", fulfilmentStatus: "CANCELLED", cancelReason: "Wrong table" });
    await expect(cancelOrder(db, { ...base, orderId: OID, reason: "Wrong table" })).resolves.toEqual({ alreadyCancelled: true });
    const db2 = await paid();
    await expect(cancelOrder(db2, { ...base, orderId: OID, reason: "Changed mind" })).rejects.toMatchObject({ code: "ORDER_NOT_CANCELLABLE" });
    const partial = seed();
    await place(partial);
    await pay(partial, REQ(1), [{ method: "CASH", amountMinor: 1000 }]);
    await expect(cancelOrder(partial, { ...base, orderId: OID, reason: "Changed mind" })).rejects.toMatchObject({ code: "ORDER_NOT_CANCELLABLE" });
  });

  it("refunds partially then fully with immutable ledger entries", async () => {
    const db = await paid();
    await refund(db, REQ(10), 100000);
    expect(get(db)).toMatchObject({ status: "PARTIALLY_REFUNDED", paymentStatus: "PARTIALLY_REFUNDED", refundedMinor: 100000 });
    await refund(db, REQ(11), total - 100000);
    expect(get(db)).toMatchObject({ status: "REFUNDED", paymentStatus: "REFUNDED", refundedMinor: total });
    expect(summarizeLedger(ledger(db))).toEqual({ paidMinor: total, refundedMinor: total, netMinor: 0 });
    expect(ledger(db).filter((e) => e.type === "PAYMENT")).toHaveLength(1); // the original payment entry is untouched
    expect(get(db).refunds).toHaveLength(2);
  });

  it("never refunds more than was paid", async () => {
    const db = await paid();
    await expect(refund(db, REQ(10), total + 1)).rejects.toMatchObject({ code: "REFUND_EXCEEDS_PAID" });
    await refund(db, REQ(11), 200000);
    await expect(refund(db, REQ(12), total - 200000 + 1)).rejects.toMatchObject({ code: "REFUND_EXCEEDS_PAID" });
    expect(get(db).refundedMinor).toBe(200000);
  });

  it("refund retries and concurrent double-taps record one refund", async () => {
    const db = await paid();
    await Promise.all(Array.from({ length: 3 }, () => refund(db, REQ(10), 50000)));
    expect(get(db).refundedMinor).toBe(50000);
    expect(ledger(db).filter((e) => e.type === "REFUND")).toHaveLength(1);
    await expect(refund(db, REQ(10), 50000)).resolves.toMatchObject({ alreadyProcessed: true });
  });

  it("refuses refunds on unpaid or cancelled orders", async () => {
    const db = seed();
    await place(db);
    await expect(refund(db, REQ(10), 1000)).rejects.toMatchObject({ code: "ORDER_NOT_REFUNDABLE" });
    await cancelOrder(db, { ...base, orderId: OID, reason: "Wrong order" });
    await expect(refund(db, REQ(11), 1000)).rejects.toMatchObject({ code: "ORDER_NOT_REFUNDABLE" });
  });

  it("an open order with a partial payment can be partly refunded and stays open", async () => {
    const db = seed();
    await place(db);
    await pay(db, REQ(1), [{ method: "CASH", amountMinor: 100000 }]);
    await refund(db, REQ(10), 40000);
    expect(get(db)).toMatchObject({ status: "OPEN", refundedMinor: 40000 });
  });

  it("the ledger always agrees with the orders after a mixed sequence", async () => {
    const db = seed();
    for (let i = 0; i < 4; i++) await place(db, `44444444-4444-4444-8444-${String(i).padStart(12, "0")}`);
    const ids = db._all(`tenants/${T1}/orders/`).map((p) => p.split("/").pop());
    await payOrder(db, { ...base, orderId: ids[0], paymentRequestId: REQ(20), payments: [{ method: "CASH", amountMinor: total }] });
    await payOrder(db, { ...base, orderId: ids[1], paymentRequestId: REQ(21), payments: [{ method: "CARD_DEMO", amountMinor: 100000 }] });
    await payOrder(db, { ...base, orderId: ids[1], paymentRequestId: REQ(22), payments: [{ method: "CASH", amountMinor: total - 100000 }] });
    await refundOrder(db, { ...base, orderId: ids[0], refundRequestId: REQ(23), amountMinor: 70000, method: "CASH", reason: "Cold food" });
    const orders = ids.map((id) => get(db, id));
    const ledgerSum = summarizeLedger(ledger(db));
    expect(orders.reduce((s, o) => s + o.paidMinor, 0)).toBe(ledgerSum.paidMinor);
    expect(orders.reduce((s, o) => s + o.refundedMinor, 0)).toBe(ledgerSum.refundedMinor);
    for (const o of orders) expect(o.paidMinor).toBe(o.payments.reduce((s, p) => s + p.amountMinor, 0));
  });

  it("moves fulfilment forward only", async () => {
    const db = seed();
    await place(db);
    const to = (status) => updateFulfilment(db, { ...base, orderId: OID, status });
    await expect(to("READY")).resolves.toMatchObject({ unchanged: false });
    await expect(to("READY")).resolves.toMatchObject({ unchanged: true });
    await expect(to("PREPARING")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await to("COMPLETED");
    await expect(to("READY")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });
});

describe("saveSettings", () => {
  it("merges validated settings into the tenant and audits the change", async () => {
    const db = seed({ [`tenants/${T1}`]: { status: "ACTIVE", settings: { currency: "PKR", other: "kept" } } });
    await saveSettings(db, { ...base, settings: { taxBp: 1600, serviceBp: 500, currency: "USD", taxLabel: "GST", taxRegistration: "", receiptFooter: "" } });
    expect(db._store.get(`tenants/${T1}`).settings).toMatchObject({ taxBp: 1600, currency: "USD", other: "kept" });
    expect(db._all(`tenants/${T1}/auditLogs/`)).toHaveLength(1);
    await expect(saveSettings(seed({ [`tenants/${T1}`]: { status: "SUSPENDED" } }), { ...base, settings: {} })).rejects.toMatchObject({ code: "TENANT_NOT_ACTIVE" });
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/store";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const placeOrderAction = vi.fn();
const payOrderAction = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }) }));
vi.mock("sonner", () => ({ toast: { success: () => {}, error: () => {} } }));
vi.mock("@/app/dashboard/pos/actions", () => ({ placeOrderAction: (...a) => placeOrderAction(...a), payOrderAction: (...a) => payOrderAction(...a) }));
vi.mock("@/app/dashboard/orders/actions", () => ({ cancelOrderAction: async () => ({ ok: true }), updateFulfilmentAction: async () => ({ ok: true }), refundOrderAction: async () => ({ ok: true }) }));

const { default: PosTerminal } = await import("@/features/pos/components/PosTerminal");
const { default: OrdersManager } = await import("@/features/orders/components/OrdersManager");

const KARAHI = "ProdKarahiAAAAAAAAAA";
const PIZZA = "ProdPizzaAAAAAAAAAAA";
const TEA = "ProdTeaAAAAAAAAAAAAA";
const categories = [{ id: "c1", name: "Mains" }];
const products = [
  { id: KARAHI, categoryId: "c1", name: "Chicken Karahi", priceMinor: 125000, available: true, variants: [], modifierGroups: [] },
  { id: PIZZA, categoryId: "c1", name: "Pizza", priceMinor: 90000, available: true, variants: [{ id: "variant-small", name: "Small", priceMinor: 90000 }, { id: "variant-large", name: "Large", priceMinor: 150000 }], modifierGroups: [{ id: "group-crust-aa", name: "Crust", min: 1, max: 1, options: [{ id: "opt-thin-001", name: "Thin", priceMinor: 0 }, { id: "opt-thick-01", name: "Thick", priceMinor: 2000 }] }] },
  { id: TEA, categoryId: "c1", name: "Tea", priceMinor: 20000, available: false, variants: [], modifierGroups: [] },
];
const settings = { currency: "PKR", taxBp: 1600, serviceBp: 0, taxLabel: "GST", taxRegistration: "", receiptFooter: "" };

let container;
let root;
let store;

async function mount(element) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(element));
}
const render = (props = {}) => {
  store = makeStore();
  return mount(createElement(Provider, { store }, createElement(PosTerminal, { tenantName: "Green Lagoon", settings, canDiscount: false, categories, products, ...props })));
};
const buttons = () => [...document.body.querySelectorAll("button")];
const byText = (text) => buttons().find((b) => b.textContent.trim().startsWith(text));
const click = async (el) => { await act(async () => el.click()); };
const clickText = async (text) => {
  const el = byText(text);
  if (!el) throw new Error(`No button "${text}". Buttons: ${buttons().map((b) => b.textContent.trim()).join(" | ")}`);
  await click(el);
};
const text = () => document.body.textContent;

beforeEach(() => {
  placeOrderAction.mockReset();
  payOrderAction.mockReset();
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.innerHTML = "";
});

const TOTAL = 125000 + 20000 * 0 + Math.floor((125000 * 1600 + 5000) / 10000); // 145000

describe("POS terminal flow", () => {
  it("adds a simple item with one tap and shows an estimate", async () => {
    await render();
    await clickText("Chicken Karahi");
    expect(text()).toContain("Review order (1)");
    expect(text()).toContain("PKR 1,450.00"); // 1,250.00 + 16% tax
  });

  it("sold-out items cannot be added", async () => {
    await render();
    const tea = byText("Tea");
    expect(tea.disabled).toBe(true);
    await click(tea);
    expect(text()).toContain("Tap an item to add it.");
  });

  it("items with sizes and required options need those choices before they can be added", async () => {
    await render();
    await clickText("Pizza");
    const add = () => buttons().find((b) => b.textContent.trim().startsWith("Add"));
    expect(add().disabled).toBe(true);
    expect(text()).toContain("Choose a size to continue.");
    await click(document.body.querySelector('input[name="variant"][type="radio"]:not(:checked)') && [...document.body.querySelectorAll('input[name="variant"]')][1]);
    expect(text()).toContain("Choose the required options to continue.");
    expect(add().disabled).toBe(true);
    await click([...document.body.querySelectorAll('input[name="g-group-crust-aa"]')][1]);
    expect(add().disabled).toBe(false);
    expect(add().textContent).toContain("PKR 1,520.00"); // large 1500 + thick 20
    await click(add());
    expect(text()).toContain("Pizza (Large)");
    expect(text()).toContain("+ Thick");
  });

  it("places an order sending only ids and quantities, then takes payment and shows the receipt", async () => {
    placeOrderAction.mockResolvedValue({ ok: true, orderId: "11111111-1111-4111-8111-111111111111", orderNumber: 7, totalMinor: TOTAL });
    payOrderAction.mockResolvedValue({
      ok: true, status: "PAID", paidMinor: TOTAL, totalMinor: TOTAL, changeMinor: 0,
      order: { orderNumber: 7, type: "TAKEAWAY", tableLabel: "", customer: { name: "" }, currency: "PKR", createdAt: "2026-03-05T14:30:00.000Z", lines: [{ lineId: "1", name: "Chicken Karahi", variantName: null, quantity: 1, lineTotalMinor: 125000, modifiers: [], note: "" }], totals: { subtotalMinor: 125000, discountMinor: 0, serviceChargeMinor: 0, taxMinor: 20000, totalMinor: TOTAL }, taxBp: 1600, serviceBp: 0, status: "PAID", paidMinor: TOTAL, refundedMinor: 0, payments: [{ txnId: "t", method: "CASH", amountMinor: TOTAL, changeMinor: 0 }], refunds: [] },
    });
    await render();
    await clickText("Chicken Karahi");
    await clickText("Review order");
    await clickText("Place and take payment");

    expect(placeOrderAction).toHaveBeenCalledTimes(1);
    const sent = placeOrderAction.mock.calls[0][0];
    expect(sent.clientOrderId).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(sent)).not.toMatch(/price|total|145000|125000/i); // the browser never sends money values
    expect(sent.order.lines).toEqual([{ productId: KARAHI, selections: [], quantity: 1, note: "" }]);
    expect(store.getState().cart.lines).toHaveLength(0); // cart cleared after a successful placement

    expect(text()).toContain("Take payment · Order #7");
    await clickText("Pay in full");
    expect(payOrderAction).toHaveBeenCalledTimes(1);
    expect(payOrderAction.mock.calls[0][0]).toMatchObject({ orderId: "11111111-1111-4111-8111-111111111111", payments: [{ method: "CASH", amountMinor: TOTAL }] });
    expect(payOrderAction.mock.calls[0][0].paymentRequestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(text()).toContain("Order #7 paid");
    expect(text()).toContain("Print receipt");
  });

  it("a failed placement keeps the cart and reuses the same idempotency key on retry", async () => {
    placeOrderAction.mockResolvedValueOnce({ ok: false, error: "Network problem" }).mockResolvedValueOnce({ ok: true, orderId: "x", orderNumber: 1, totalMinor: TOTAL });
    await render();
    await clickText("Chicken Karahi");
    await clickText("Review order");
    await clickText("Send order, pay later");
    expect(text()).toContain("Network problem");
    expect(store.getState().cart.lines).toHaveLength(1);
    await clickText("Send order, pay later");
    expect(placeOrderAction).toHaveBeenCalledTimes(2);
    expect(placeOrderAction.mock.calls[1][0].clientOrderId).toBe(placeOrderAction.mock.calls[0][0].clientOrderId);
    expect(store.getState().cart.lines).toHaveLength(0);
  });

  it("changing the cart after a failure starts a new idempotency key", async () => {
    placeOrderAction.mockResolvedValue({ ok: false, error: "Network problem" });
    await render();
    await clickText("Chicken Karahi");
    await clickText("Review order");
    await clickText("Send order, pay later");
    const first = placeOrderAction.mock.calls[0][0].clientOrderId;
    await act(async () => document.body.querySelector('[role="dialog"] button[aria-label="Close"]').click());
    await clickText("Chicken Karahi");
    await clickText("Review order");
    await clickText("Send order, pay later");
    expect(placeOrderAction.mock.calls[1][0].clientOrderId).not.toBe(first);
    expect(placeOrderAction.mock.calls[1][0].order.lines[0].quantity).toBe(2);
  });

  it("a failed payment keeps the same payment request id for the retry, so it cannot double-charge", async () => {
    placeOrderAction.mockResolvedValue({ ok: true, orderId: "11111111-1111-4111-8111-111111111111", orderNumber: 3, totalMinor: TOTAL });
    payOrderAction.mockResolvedValueOnce({ ok: false, error: "Network problem" }).mockResolvedValueOnce({ ok: true, status: "OPEN", paidMinor: TOTAL, totalMinor: TOTAL * 2 });
    await render();
    await clickText("Chicken Karahi");
    await clickText("Review order");
    await clickText("Place and take payment");
    await clickText("Pay in full");
    expect(text()).toContain("Network problem");
    await clickText("Pay in full");
    expect(payOrderAction).toHaveBeenCalledTimes(2);
    expect(payOrderAction.mock.calls[1][0].paymentRequestId).toBe(payOrderAction.mock.calls[0][0].paymentRequestId);
  });

  it("dine-in orders need a table, delivery orders need customer details (checked before sending)", async () => {
    await render();
    await clickText("Chicken Karahi");
    await clickText("Review order");
    await act(async () => [...document.body.querySelectorAll('input[name="order-type"]')][0].click()); // Dine in
    await clickText("Send order, pay later");
    expect(text()).toContain("Enter the table");
    expect(placeOrderAction).not.toHaveBeenCalled();
    await act(async () => [...document.body.querySelectorAll('input[name="order-type"]')][2].click()); // Delivery
    await clickText("Send order, pay later");
    expect(text()).toContain("Enter the customer");
    expect(placeOrderAction).not.toHaveBeenCalled();
  });

  it("only users with the discount permission see discount controls", async () => {
    await render({ canDiscount: false });
    await clickText("Chicken Karahi");
    await clickText("Review order");
    expect(text()).not.toContain("Discount");
    await act(async () => root.unmount());
    document.body.innerHTML = "";
    await render({ canDiscount: true });
    await clickText("Chicken Karahi");
    await clickText("Review order");
    expect(text()).toContain("Discount");
  });

  it("split payments: 'Split' divides the balance equally and the payments add up exactly", async () => {
    placeOrderAction.mockResolvedValue({ ok: true, orderId: "11111111-1111-4111-8111-111111111111", orderNumber: 9, totalMinor: 100001 });
    payOrderAction.mockResolvedValue({ ok: true, status: "OPEN", paidMinor: 100001, totalMinor: 100001 });
    await render();
    await clickText("Chicken Karahi");
    await clickText("Review order");
    await clickText("Place and take payment");
    await act(async () => { /* dialog is open */ });
    const input = document.body.querySelector("#split-count");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, "3");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await clickText("Split");
    await clickText("Pay in full");
    const payments = payOrderAction.mock.calls[0][0].payments;
    expect(payments).toHaveLength(3);
    expect(payments.reduce((s, p) => s + p.amountMinor, 0)).toBe(100001);
    expect(Math.max(...payments.map((p) => p.amountMinor)) - Math.min(...payments.map((p) => p.amountMinor))).toBeLessThanOrEqual(1);
  });
});

describe("Orders screen permissions", () => {
  const order = (over = {}) => ({
    id: "11111111-1111-4111-8111-111111111111", orderNumber: 5, type: "TAKEAWAY", tableLabel: "", customer: { name: "Ayesha", phone: "" }, currency: "PKR", createdAt: "2026-03-05T14:30:00.000Z",
    lines: [{ lineId: "1", name: "Chicken Karahi", variantName: null, quantity: 1, lineTotalMinor: 125000, modifiers: [], note: "" }],
    totals: { subtotalMinor: 125000, discountMinor: 0, serviceChargeMinor: 0, taxMinor: 20000, totalMinor: 145000 }, discount: null,
    status: "OPEN", paymentStatus: "UNPAID", paidMinor: 0, refundedMinor: 0, payments: [], refunds: [], fulfilmentStatus: "NEW", ...over,
  });
  const mountOrders = (orders, can) => mount(createElement(OrdersManager, { orders, settings, tenantName: "Green Lagoon", can }));

  it("shows payment, cancel and kitchen actions only to those who hold the permission", async () => {
    await mountOrders([order()], { takePayment: false, cancel: false, refund: false, fulfil: false });
    await clickText("View");
    expect(text()).toContain("Order #5");
    for (const label of ["Take payment", "Cancel order", "Mark preparing", "Refund"]) expect(byText(label), label).toBeUndefined();
    expect(byText("Receipt")).toBeDefined();
    await act(async () => root.unmount());
    document.body.innerHTML = "";
    await mountOrders([order()], { takePayment: true, cancel: true, refund: false, fulfil: true });
    await clickText("View");
    expect(byText("Take payment")).toBeDefined();
    expect(byText("Cancel order")).toBeDefined();
    expect(byText("Mark preparing")).toBeDefined();
    expect(byText("Refund")).toBeUndefined();
  });

  it("offers a refund only on paid orders and only with the refund permission", async () => {
    const paid = order({ status: "PAID", paymentStatus: "PAID", paidMinor: 145000, payments: [{ txnId: "t", method: "CASH", amountMinor: 145000, changeMinor: 0 }] });
    await mountOrders([paid], { takePayment: true, cancel: true, refund: true, fulfil: false });
    await clickText("View");
    expect(byText("Refund")).toBeDefined();
    expect(byText("Take payment")).toBeUndefined(); // nothing due
    expect(byText("Cancel order")).toBeUndefined(); // paid orders are refunded, not cancelled
  });

  it("filters the list by status and search", async () => {
    const rows = [order({ id: "a", orderNumber: 1 }), order({ id: "b", orderNumber: 2, status: "PAID", customer: { name: "Bilal", phone: "" } })];
    await mountOrders(rows, { takePayment: false, cancel: false, refund: false, fulfil: false });
    expect(document.body.querySelectorAll("tbody tr")).toHaveLength(2);
    const select = document.body.querySelector("#orders-status");
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, "PAID");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(document.body.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(text()).toContain("Bilal");
  });
});

import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Receipt from "@/features/pos/components/Receipt";

const order = (over = {}) => ({
  orderNumber: 42, type: "DINE_IN", tableLabel: "T5", customer: { name: "Ayesha" }, currency: "PKR", createdAt: "2026-03-05T14:30:00.000Z",
  lines: [
    { lineId: "1", name: "Chicken Karahi", variantName: null, quantity: 2, lineTotalMinor: 250000, modifiers: [], note: "" },
    { lineId: "2", name: "Pizza", variantName: "Large", quantity: 1, lineTotalMinor: 165000, modifiers: [{ groupId: "g", groupName: "Toppings", options: [{ id: "o", name: "Olives", priceMinor: 5000 }] }], note: "no onions" },
  ],
  totals: { subtotalMinor: 415000, discountMinor: 41500, serviceChargeMinor: 18675, taxMinor: 63000, totalMinor: 455175 },
  taxBp: 1600, serviceBp: 500, status: "PAID", paidMinor: 455175, refundedMinor: 0,
  payments: [{ txnId: "t1", method: "CASH", amountMinor: 455175, changeMinor: 4825 }, { txnId: "t2", method: "CARD_DEMO", amountMinor: 0, changeMinor: 0 }], refunds: [], ...over,
});
const settings = { taxLabel: "GST", taxRegistration: "NTN-1234", receiptFooter: "Thank you!" };
const render = (o, s = settings) => renderToStaticMarkup(createElement(Receipt, { order: o, tenantName: "Green Lagoon", settings: s }));

describe("Receipt", () => {
  it("shows the sale snapshot: lines, options, notes, totals, payments and change", () => {
    const html = render(order());
    for (const text of ["Green Lagoon", "Order #42", "T5", "2 x Chicken Karahi", "1 x Pizza (Large)", "+ Olives", "Note: no onions", "PKR 4,150.00"]) expect(html).toContain(text);
    expect(html).toContain("Discount");
    expect(html).toContain("Service charge (5.00%)");
    expect(html).toContain("GST (16.00%)");
    expect(html).toContain("PKR 4,551.75"); // total
    expect(html).toContain("Cash");
    expect(html).toContain("Change");
    expect(html).toContain("PAID");
    expect(html).toContain("GST reg: NTN-1234");
    expect(html).toContain("Thank you!");
    expect(html).toContain("demo payments"); // card/wallet payments are labelled demo
  });
  it("omits lines that do not apply", () => {
    const html = render(order({ totals: { subtotalMinor: 100, discountMinor: 0, serviceChargeMinor: 0, taxMinor: 0, totalMinor: 100 }, payments: [], status: "OPEN" }), { taxLabel: "Tax", taxRegistration: "", receiptFooter: "" });
    expect(html).not.toContain("Discount");
    expect(html).not.toContain("Service charge");
    expect(html).not.toContain("Tax (");
    expect(html).not.toContain("reg:");
    expect(html).not.toContain("demo payments");
    expect(html).toContain("OPEN");
  });
  it("shows refunds and cancellation", () => {
    expect(render(order({ refundedMinor: 10000, status: "PARTIALLY_REFUNDED" }))).toContain("Refunded");
    expect(render(order({ status: "CANCELLED", payments: [] }))).toContain("CANCELLED");
  });
  it("escapes all text from the order", () => {
    const evil = "<script>alert(1)</script>";
    const html = renderToStaticMarkup(createElement(Receipt, { order: order({ customer: { name: evil }, lines: [{ lineId: "1", name: evil, variantName: evil, quantity: 1, lineTotalMinor: 1, modifiers: [], note: evil }] }), tenantName: evil, settings: { ...settings, receiptFooter: evil, taxRegistration: evil } }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

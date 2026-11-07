import { describe, it, expect } from "vitest";
import { filterOrders, orderBadge } from "@/lib/pos/filters";

const orders = [
  { id: "a", orderNumber: 1, type: "DINE_IN", tableLabel: "T5", customer: { name: "", phone: "" }, status: "OPEN", paidMinor: 0 },
  { id: "b", orderNumber: 12, type: "DELIVERY", tableLabel: "", customer: { name: "Ayesha Khan", phone: "0300 1112222" }, status: "PAID", paidMinor: 1000 },
  { id: "c", orderNumber: 103, type: "TAKEAWAY", tableLabel: "", customer: { name: "Bilal", phone: "" }, status: "CANCELLED", paidMinor: 0 },
];

describe("filterOrders", () => {
  it("filters by status and type", () => {
    expect(filterOrders(orders, { status: "PAID" }).map((o) => o.id)).toEqual(["b"]);
    expect(filterOrders(orders, { type: "DINE_IN" }).map((o) => o.id)).toEqual(["a"]);
    expect(filterOrders(orders, { status: "PAID", type: "DINE_IN" })).toHaveLength(0);
  });
  it("searches number (with or without #), table, name and phone", () => {
    expect(filterOrders(orders, { search: "#12" }).map((o) => o.id)).toEqual(["b"]);
    expect(filterOrders(orders, { search: "10" }).map((o) => o.id)).toEqual(["c"]);
    expect(filterOrders(orders, { search: "t5" }).map((o) => o.id)).toEqual(["a"]);
    expect(filterOrders(orders, { search: "AYESHA" }).map((o) => o.id)).toEqual(["b"]);
    expect(filterOrders(orders, { search: "1112" }).map((o) => o.id)).toEqual(["b"]);
    expect(filterOrders(orders, { search: "   " })).toHaveLength(3);
  });
});

describe("orderBadge", () => {
  it("labels every state, including partial payment", () => {
    expect(orderBadge({ status: "OPEN", paidMinor: 0 }).label).toBe("Unpaid");
    expect(orderBadge({ status: "OPEN", paidMinor: 5 }).label).toBe("Partly paid");
    expect(orderBadge({ status: "PAID" }).label).toBe("Paid");
    expect(orderBadge({ status: "PARTIALLY_REFUNDED" }).label).toBe("Partly refunded");
    expect(orderBadge({ status: "REFUNDED" }).label).toBe("Refunded");
    expect(orderBadge({ status: "CANCELLED" }).label).toBe("Cancelled");
    expect(orderBadge({ status: "MYSTERY" }).label).toBe("MYSTERY");
  });
});

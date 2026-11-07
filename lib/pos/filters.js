/** Order history filter: status, type, and free text over number, table, customer name and phone. */
export function filterOrders(orders, { status = "ALL", type = "ALL", search = "" } = {}) {
  const needle = search.trim().toLowerCase().replace(/^#/, "");
  return orders.filter((o) => {
    if (status !== "ALL" && o.status !== status) return false;
    if (type !== "ALL" && o.type !== type) return false;
    if (!needle) return true;
    return [String(o.orderNumber), o.tableLabel, o.customer?.name, o.customer?.phone].some((v) => typeof v === "string" && v.toLowerCase().includes(needle));
  });
}

/** One label + tone for an order, covering partial payment and refund states. */
export function orderBadge(order) {
  switch (order.status) {
    case "OPEN": return order.paidMinor > 0 ? { status: "warning", label: "Partly paid" } : { status: "PENDING", label: "Unpaid" };
    case "PAID": return { status: "ACTIVE", label: "Paid" };
    case "PARTIALLY_REFUNDED": return { status: "warning", label: "Partly refunded" };
    case "REFUNDED": return { status: "neutral", label: "Refunded" };
    case "CANCELLED": return { status: "REJECTED", label: "Cancelled" };
    default: return { status: "neutral", label: order.status };
  }
}

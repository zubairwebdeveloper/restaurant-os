export const ORDER_TYPES = Object.freeze(["DINE_IN", "TAKEAWAY", "DELIVERY"]);
export const ORDER_TYPE_LABELS = Object.freeze({ DINE_IN: "Dine in", TAKEAWAY: "Takeaway", DELIVERY: "Delivery" });

/** Demo payment methods only. Real gateways need explicit approval and a separate integration phase. */
export const PAYMENT_METHODS = Object.freeze(["CASH", "CARD_DEMO", "WALLET_DEMO"]);
export const PAYMENT_METHOD_LABELS = Object.freeze({ CASH: "Cash", CARD_DEMO: "Card (demo)", WALLET_DEMO: "Mobile wallet (demo)" });

export const ORDER_STATUSES = Object.freeze(["OPEN", "PAID", "PARTIALLY_REFUNDED", "REFUNDED", "CANCELLED"]);
export const FULFILMENT_STATUSES = Object.freeze(["NEW", "PREPARING", "READY", "COMPLETED", "CANCELLED"]);

/** Forward-only kitchen/fulfilment progress. */
export const FULFILMENT_TRANSITIONS = Object.freeze({
  NEW: ["PREPARING", "READY", "COMPLETED"],
  PREPARING: ["READY", "COMPLETED"],
  READY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
});

export const POS_LIMITS = Object.freeze({
  MAX_LINES: 60,
  MAX_QUANTITY: 99,
  MAX_ORDER_TOTAL_MINOR: 1_000_000_000,
  MAX_PAYMENTS_PER_ORDER: 20,
  MAX_PAYMENTS_PER_REQUEST: 10,
  MAX_TAX_BP: 5000, // 50%
  MAX_SERVICE_BP: 3000, // 30%
});

export const DEFAULT_POS_SETTINGS = Object.freeze({
  currency: "PKR", taxBp: 0, serviceBp: 0, taxLabel: "Tax", taxRegistration: "", receiptFooter: "",
});

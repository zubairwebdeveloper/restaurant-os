import { z } from "zod";
import { CURRENCIES } from "@/config/menu";
import { ORDER_TYPES, FULFILMENT_STATUSES, PAYMENT_METHODS, POS_LIMITS } from "@/config/pos";
import { parsePercentInput } from "@/lib/utils/money";

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, "Invalid id");
const productId = z.string().regex(/^[A-Za-z0-9]{20}$/, "Invalid product");
const entryId = z.string().regex(/^[A-Za-z0-9-]{8,40}$/, "Invalid id");
const minor = z.number().int().min(1).max(POS_LIMITS.MAX_ORDER_TOTAL_MINOR);
const reason = z.string().trim().min(5, "Give a reason (at least 5 characters)").max(200);

export const orderIdSchema = uuid;

const lineSchema = z.object({
  productId,
  variantId: entryId.optional(),
  selections: z.array(z.object({ groupId: entryId, optionIds: z.array(entryId).max(20) })).max(10).default([]),
  quantity: z.number().int().min(1).max(POS_LIMITS.MAX_QUANTITY),
  note: z.string().trim().max(120).default(""),
});

export const orderInputSchema = z
  .object({
    type: z.enum(ORDER_TYPES),
    tableLabel: z.string().trim().max(20).default(""),
    customer: z
      .object({
        name: z.string().trim().max(80).default(""),
        phone: z.string().trim().max(24).default("").refine((v) => v === "" || /^[0-9+()\-\s]{6,24}$/.test(v), "Use digits, spaces, + ( ) or -"),
        address: z.string().trim().max(200).default(""),
      })
      .default({ name: "", phone: "", address: "" }),
    lines: z.array(lineSchema).min(1, "Add at least one item").max(POS_LIMITS.MAX_LINES),
    discount: z
      .object({
        type: z.enum(["PERCENT", "FIXED"]),
        value: z.number().int().min(1).max(POS_LIMITS.MAX_ORDER_TOTAL_MINOR), // basis points for PERCENT, minor units for FIXED
        reason: z.string().trim().min(3, "Give a reason for the discount").max(120),
      })
      .nullable()
      .default(null),
    note: z.string().trim().max(200).default(""),
  })
  .superRefine((o, ctx) => {
    if (o.type === "DINE_IN" && !o.tableLabel) ctx.addIssue({ code: "custom", path: ["tableLabel"], message: "Enter the table" });
    if (o.type === "DELIVERY") {
      if (!o.customer.name) ctx.addIssue({ code: "custom", path: ["customer", "name"], message: "Enter the customer's name" });
      if (!o.customer.phone) ctx.addIssue({ code: "custom", path: ["customer", "phone"], message: "Enter a phone number" });
      if (!o.customer.address) ctx.addIssue({ code: "custom", path: ["customer", "address"], message: "Enter the delivery address" });
    }
    if (o.discount?.type === "PERCENT" && o.discount.value > 10000) ctx.addIssue({ code: "custom", path: ["discount", "value"], message: "A discount cannot exceed 100%" });
  });

export const placeOrderSchema = z.object({ clientOrderId: uuid, order: orderInputSchema });

const paymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  amountMinor: minor,
  tenderedMinor: minor.optional(), // cash only
  reference: z.string().trim().max(40).optional(),
});

export const payOrderSchema = z.object({
  orderId: uuid,
  paymentRequestId: uuid,
  payments: z.array(paymentSchema).min(1).max(POS_LIMITS.MAX_PAYMENTS_PER_REQUEST),
});

export const cancelOrderSchema = z.object({ orderId: uuid, reason });
export const refundOrderSchema = z.object({ orderId: uuid, refundRequestId: uuid, amountMinor: minor, method: z.enum(PAYMENT_METHODS), reason });
export const fulfilmentSchema = z.object({ orderId: uuid, status: z.enum(FULFILMENT_STATUSES.filter((s) => s !== "CANCELLED")) });

/** Business and POS settings (percentages typed as text, stored as basis points). */
export const settingsFormSchema = z
  .object({
    currency: z.enum(CURRENCIES),
    taxPercent: z.string().trim(),
    servicePercent: z.string().trim(),
    taxLabel: z.string().trim().max(20),
    taxRegistration: z.string().trim().max(40),
    receiptFooter: z.string().trim().max(200),
  })
  .superRefine((v, ctx) => {
    const tax = parsePercentInput(v.taxPercent || "0");
    const service = parsePercentInput(v.servicePercent || "0");
    if (tax === null || tax > POS_LIMITS.MAX_TAX_BP) ctx.addIssue({ code: "custom", path: ["taxPercent"], message: "Enter a percentage from 0 to 50, for example 16" });
    if (service === null || service > POS_LIMITS.MAX_SERVICE_BP) ctx.addIssue({ code: "custom", path: ["servicePercent"], message: "Enter a percentage from 0 to 30, for example 5" });
  });

export function settingsFromForm(form) {
  return {
    currency: form.currency,
    taxBp: parsePercentInput(form.taxPercent || "0"),
    serviceBp: parsePercentInput(form.servicePercent || "0"),
    taxLabel: form.taxLabel || "Tax",
    taxRegistration: form.taxRegistration,
    receiptFooter: form.receiptFooter,
  };
}

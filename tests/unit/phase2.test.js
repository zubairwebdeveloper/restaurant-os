import { describe, expect, it, beforeEach } from "vitest";
import { reservationSchema, contactSchema, newsletterSchema } from "@/lib/validations/forms";
import { useCartStore, selectCartCount, selectCartTotal } from "@/store/cart-store";
import { getMenuItems, getMenuItemBySlug, getRelatedItems } from "@/services/menu";
import { menuItems, categories } from "@/features/menu/data";

const future = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
const valid = { name: "Ali Khan", phone: "03001234567", email: "ali@example.com", date: future, time: "19:00", guests: "4" };

describe("reservationSchema", () => {
  it("accepts a valid request and coerces guests", () => {
    const r = reservationSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data.guests).toBe(4);
  });
  it("rejects past dates", () => {
    expect(reservationSchema.safeParse({ ...valid, date: "2020-01-01" }).success).toBe(false);
  });
  it("rejects more than 40 guests", () => {
    expect(reservationSchema.safeParse({ ...valid, guests: "41" }).success).toBe(false);
  });
});

describe("other forms", () => {
  it("validates contact and newsletter", () => {
    expect(contactSchema.safeParse({ name: "Sara", email: "s@x.com", subject: "Hello", message: "A long enough message" }).success).toBe(true);
    expect(newsletterSchema.safeParse({ email: "bad" }).success).toBe(false);
  });
});

describe("cart store", () => {
  beforeEach(() => useCartStore.getState().clear());
  it("adds, increments and totals", () => {
    const { add } = useCartStore.getState();
    add({ id: "a", name: "A", price: 100 });
    add({ id: "a", name: "A", price: 100 });
    add({ id: "b", name: "B", price: 250 });
    const s = useCartStore.getState();
    expect(selectCartCount(s)).toBe(3);
    expect(selectCartTotal(s)).toBe(450);
  });
  it("removes a line when quantity hits zero", () => {
    useCartStore.getState().add({ id: "a", name: "A", price: 100 });
    useCartStore.getState().setQty("a", 0);
    expect(useCartStore.getState().lines).toHaveLength(0);
  });
});

describe("menu data and service", () => {
  it("has unique slugs and valid categories", () => {
    expect(new Set(menuItems.map((i) => i.slug)).size).toBe(menuItems.length);
    const ids = categories.map((c) => c.id);
    expect(menuItems.every((i) => ids.includes(i.category))).toBe(true);
  });
  it("filters featured and finds by slug", async () => {
    expect((await getMenuItems({ featured: true })).length).toBeGreaterThan(0);
    expect((await getMenuItemBySlug("lamb-karahi"))?.name).toBe("Lagoon Lamb Karahi");
    expect(await getMenuItemBySlug("nope")).toBeNull();
  });
  it("related items share category and exclude self", async () => {
    const item = await getMenuItemBySlug("lamb-karahi");
    const rel = await getRelatedItems(item);
    expect(rel.every((r) => r.category === item.category && r.id !== item.id)).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { toSerializable } from "@/lib/utils/serialize";
import { tenantApplicationInputSchema, tenantIdSchema } from "@/schemas/tenant.schema";

describe("toSerializable", () => {
  it("converts Timestamp-like objects and Dates to ISO strings", () => {
    const ts = { toDate: () => new Date("2026-01-02T03:04:05.000Z"), seconds: 1 };
    expect(toSerializable({ a: ts, nested: { b: [ts] }, d: new Date("2026-01-01T00:00:00Z") })).toEqual({
      a: "2026-01-02T03:04:05.000Z",
      nested: { b: ["2026-01-02T03:04:05.000Z"] },
      d: "2026-01-01T00:00:00.000Z",
    });
  });

  it("drops functions and keeps primitives and null", () => {
    expect(toSerializable({ f: () => 1, n: null, x: 5, s: "ok" })).toEqual({ n: null, x: 5, s: "ok" });
  });

  it("produces JSON-safe output", () => {
    const ts = { toDate: () => new Date(0) };
    expect(() => JSON.stringify(toSerializable({ ts }))).not.toThrow();
  });
});

describe("tenant schemas", () => {
  const valid = { restaurantName: "  City Cafe ", businessType: "CAFE", city: "Lahore", country: "Pakistan", phone: "+92 300 1234567" };

  it("accepts a valid application and trims input", () => {
    const r = tenantApplicationInputSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data.restaurantName).toBe("City Cafe");
  });

  it("rejects bad input", () => {
    expect(tenantApplicationInputSchema.safeParse({ ...valid, restaurantName: "A" }).success).toBe(false);
    expect(tenantApplicationInputSchema.safeParse({ ...valid, businessType: "BANK" }).success).toBe(false);
    expect(tenantApplicationInputSchema.safeParse({ ...valid, phone: "call me" }).success).toBe(false);
  });

  it("validates tenant ids", () => {
    expect(tenantIdSchema.safeParse("AAAAAAAAAAAAAAAAAAAA").success).toBe(true);
    expect(tenantIdSchema.safeParse("../x").success).toBe(false);
  });
});

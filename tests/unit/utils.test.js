import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { phoneSchema, emailSchema } from "@/lib/validations/common";
import { PUBLIC_ROUTES } from "@/lib/constants";

describe("cn", () => {
  it("merges conflicting tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("formatPrice", () => {
  it("formats PKR without decimals", () => {
    expect(formatPrice(1500)).toContain("1,500");
  });
  it("returns empty string for invalid input", () => {
    expect(formatPrice("abc")).toBe("");
  });
});

describe("validation schemas", () => {
  it("accepts valid Pakistani mobile numbers", () => {
    expect(phoneSchema.safeParse("03001234567").success).toBe(true);
    expect(phoneSchema.safeParse("+923001234567").success).toBe(true);
  });
  it("rejects invalid phone numbers", () => {
    expect(phoneSchema.safeParse("12345").success).toBe(false);
  });
  it("lowercases and validates email", () => {
    const r = emailSchema.safeParse("Guest@Example.com");
    expect(r.success && r.data).toBe("guest@example.com");
  });
});

describe("public routes", () => {
  it("never include admin paths", () => {
    expect(PUBLIC_ROUTES.some((r) => r.startsWith("/admin"))).toBe(false);
  });
});

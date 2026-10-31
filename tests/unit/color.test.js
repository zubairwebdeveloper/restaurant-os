import { describe, it, expect } from "vitest";
import {
  buildBrandStyle, contrastRatio, normalizeHex, readableForeground, MIN_TEXT_CONTRAST,
} from "@/lib/utils/color";

describe("color utils", () => {
  it("normalizes hex values", () => {
    expect(normalizeHex("#abc")).toBe("#AABBCC");
    expect(normalizeHex("1c2330")).toBe("#1C2330");
    expect(normalizeHex("nope")).toBeNull();
    expect(normalizeHex(null)).toBeNull();
  });

  it("computes WCAG contrast", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    expect(contrastRatio("#xyz", "#FFFFFF")).toBeNull();
  });

  it("picks a readable foreground", () => {
    expect(readableForeground("#111111")).toBe("#FFFFFF");
    expect(readableForeground("#F5E6C8")).toBe("#14181F");
  });

  it("accepts accessible brand colours", () => {
    const r = buildBrandStyle("#1C2330");
    expect(r.ok).toBe(true);
    expect(r.ratio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(r.style["--primary"]).toBe("#1C2330");
  });

  it("rejects invalid and low-contrast brand colours", () => {
    expect(buildBrandStyle("banana")).toEqual({ ok: false, reason: "invalid-color" });
    const mid = buildBrandStyle("#7A7A7A");
    expect(mid.ok).toBe(false);
    expect(mid.reason).toBe("low-contrast");
  });
});

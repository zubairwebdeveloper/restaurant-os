/**
 * Colour helpers used to keep tenant branding accessible.
 * Contrast math follows WCAG 2.x relative luminance.
 */

export const MIN_TEXT_CONTRAST = 4.5; // WCAG AA, normal text

export function normalizeHex(input) {
  if (typeof input !== "string") return null;
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return `#${h.toUpperCase()}`;
}

export function hexToRgb(hex) {
  const n = normalizeHex(hex);
  if (!n) return null;
  const v = parseInt(n.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

function channel(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Pick whichever of two candidate text colours reads best on `background`. */
export function readableForeground(background, light = "#FFFFFF", dark = "#14181F") {
  const cl = contrastRatio(background, light);
  const cd = contrastRatio(background, dark);
  if (cl === null || cd === null) return null;
  return cl >= cd ? light : dark;
}

/**
 * Build the scoped CSS variables for a tenant brand colour.
 * Returns { ok: false, reason } instead of an inaccessible palette.
 * Apply the result as the `style` of a tenant wrapper element only.
 */
export function buildBrandStyle(hex) {
  const color = normalizeHex(hex);
  if (!color) return { ok: false, reason: "invalid-color" };
  const fg = readableForeground(color);
  const ratio = contrastRatio(color, fg);
  if (ratio < MIN_TEXT_CONTRAST) return { ok: false, reason: "low-contrast", ratio };
  return {
    ok: true,
    ratio,
    style: { "--primary": color, "--primary-foreground": fg, "--ring": color },
  };
}

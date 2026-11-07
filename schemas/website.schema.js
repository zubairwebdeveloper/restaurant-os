import { z } from "zod";
import { DAYS, FONT_PAIRINGS, RESERVED_SLUGS, TEMPLATE_IDS } from "@/config/restaurant-templates";
import { buildBrandStyle, normalizeHex } from "@/lib/utils/color";

const text = (max) => z.string().trim().max(max).default("");

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const optionalUrl = z.string().trim().max(200).default("").refine((v) => v === "" || isHttpsUrl(v), "Use a full link starting with https://");
const optionalPhone = z.string().trim().max(24).default("").refine((v) => v === "" || /^[0-9+()\-\s]{6,24}$/.test(v), "Use digits, spaces, + ( ) or -");
const optionalEmail = z.string().trim().max(254).default("").refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time, for example 09:30");

/** 3-40 chars: lowercase letters, digits and single hyphens inside. Not a reserved word. */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/, "Use 3-40 lowercase letters, numbers or hyphens")
  .refine((v) => !v.includes("--"), "Do not use two hyphens in a row")
  .refine((v) => !RESERVED_SLUGS.includes(v), "That address is reserved. Choose another");

export const brandingSchema = z.object({
  template: z.enum(TEMPLATE_IDS),
  fontPairing: z.enum(Object.keys(FONT_PAIRINGS)),
  primaryColor: z
    .string()
    .refine((v) => normalizeHex(v) !== null, "Enter a colour like #1C2330")
    .refine((v) => normalizeHex(v) === null || buildBrandStyle(v).ok, "This colour is too light or too mid-tone for readable text. Try a darker or lighter shade")
    .transform((v) => normalizeHex(v)),
  tagline: text(120),
});

const hourRow = z.object({ day: z.enum(DAYS), closed: z.boolean(), open: time, close: time });

export const websiteSchema = z.object({
  slug: z.union([z.literal(""), slugSchema]).default(""),
  hero: z.object({ headline: text(90), subheadline: text(240), ctaLabel: text(30), ctaUrl: optionalUrl }),
  about: z.object({ title: text(80), body: text(2000) }),
  contact: z.object({ phone: optionalPhone, email: optionalEmail, address: text(200), mapUrl: optionalUrl }),
  hours: z.array(hourRow).length(7, "Provide opening hours for all 7 days"),
  social: z.object({ instagram: optionalUrl, facebook: optionalUrl, tiktok: optionalUrl, website: optionalUrl, whatsapp: optionalPhone }),
  seo: z.object({ title: text(70), description: text(160) }),
});

/** What must exist before a site can go live. */
export function publishReadiness(branding, website) {
  const missing = [];
  if (!branding?.template) missing.push("template");
  if (!website?.slug) missing.push("web address");
  if (!website?.hero?.headline) missing.push("hero headline");
  return { ready: missing.length === 0, missing };
}

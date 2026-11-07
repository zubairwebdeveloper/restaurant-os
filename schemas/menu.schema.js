import { z } from "zod";
import { DIETARY_KEYS, LIMITS, VISIBILITY } from "@/config/menu";

const docId = z.string().regex(/^[A-Za-z0-9]{20}$/, "Invalid id");
const entryId = z.string().regex(/^[A-Za-z0-9-]{8,40}$/, "Invalid id").optional();
const price = z.number().int("Price must be a whole number of minor units").min(0).max(LIMITS.MAX_PRICE_MINOR);
const name = (max) => z.string().trim().min(1, "Required").max(max);

export const categorySchema = z.object({
  name: name(60),
  description: z.string().trim().max(200).default(""),
  visibility: z.enum(VISIBILITY).default("PUBLIC"),
});

const variantSchema = z.object({ id: entryId, name: name(40), priceMinor: price });

const optionSchema = z.object({ id: entryId, name: name(40), priceMinor: price });

const modifierGroupSchema = z
  .object({
    id: entryId,
    name: name(40),
    min: z.number().int().min(0).max(LIMITS.MAX_OPTIONS_PER_GROUP),
    max: z.number().int().min(1).max(LIMITS.MAX_OPTIONS_PER_GROUP),
    options: z.array(optionSchema).min(1, "Add at least one option").max(LIMITS.MAX_OPTIONS_PER_GROUP),
  })
  .refine((g) => g.min <= g.max, { path: ["min"], message: "Minimum cannot exceed maximum" })
  .refine((g) => g.max <= g.options.length, { path: ["max"], message: "Maximum cannot exceed the number of options" })
  .refine((g) => new Set(g.options.map((o) => o.name.toLowerCase())).size === g.options.length, { path: ["options"], message: "Option names must be different" });

export const productSchema = z
  .object({
    categoryId: docId,
    name: name(80),
    description: z.string().trim().max(500).default(""),
    priceMinor: price,
    variants: z.array(variantSchema).max(LIMITS.MAX_VARIANTS).default([]),
    modifierGroups: z.array(modifierGroupSchema).max(LIMITS.MAX_MODIFIER_GROUPS).default([]),
    dietary: z.array(z.enum(DIETARY_KEYS)).max(DIETARY_KEYS.length).default([]),
    prepTimeMinutes: z.number().int().min(0).max(240).default(0),
    featured: z.boolean().default(false),
    available: z.boolean().default(true),
    visibility: z.enum(VISIBILITY).default("PUBLIC"),
  })
  .refine((p) => new Set(p.variants.map((v) => v.name.toLowerCase())).size === p.variants.length, { path: ["variants"], message: "Variant names must be different" })
  .transform((p) => ({ ...p, dietary: [...new Set(p.dietary)] }));

export const idListSchema = z.array(docId).min(1).max(LIMITS.MAX_PRODUCTS);
export const idSchema = docId;
export const availabilitySchema = z.object({ productId: docId, available: z.boolean() });
export const reorderProductsSchema = z.object({ categoryId: docId, orderedIds: idListSchema });

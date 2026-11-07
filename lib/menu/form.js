import { z } from "zod";
import { DIETARY_KEYS, LIMITS, VISIBILITY } from "@/config/menu";
import { minorToInput, parseMoneyInput } from "@/lib/utils/money";

/**
 * Form-side model for the product editor. Prices are typed as text ("12.50") and converted to
 * integer minor units on submit. The server validates again with schemas/menu.schema.js.
 */
const optionalId = z.string().optional();

export const productFormSchema = z
  .object({
    categoryId: z.string().min(1, "Choose a category"),
    name: z.string().trim().min(1, "Enter a name").max(80),
    description: z.string().trim().max(500),
    price: z.string(),
    variants: z.array(z.object({ id: optionalId, name: z.string().trim().min(1, "Enter a name").max(40), price: z.string() })).max(LIMITS.MAX_VARIANTS),
    modifierGroups: z
      .array(
        z.object({
          id: optionalId,
          name: z.string().trim().min(1, "Enter a name").max(40),
          min: z.coerce.number().int("Whole number").min(0),
          max: z.coerce.number().int("Whole number").min(1, "At least 1"),
          options: z.array(z.object({ id: optionalId, name: z.string().trim().min(1, "Enter a name").max(40), price: z.string() })).min(1, "Add at least one option").max(LIMITS.MAX_OPTIONS_PER_GROUP),
        }),
      )
      .max(LIMITS.MAX_MODIFIER_GROUPS),
    dietary: z.array(z.enum(DIETARY_KEYS)),
    prepTimeMinutes: z.coerce.number().int("Whole number").min(0).max(240, "At most 240"),
    featured: z.boolean(),
    available: z.boolean(),
    visibility: z.enum(VISIBILITY),
  })
  .superRefine((v, ctx) => {
    const bad = (path) => ctx.addIssue({ code: "custom", path, message: "Enter an amount like 12.50" });
    if (v.variants.length === 0 && parseMoneyInput(v.price) === null) bad(["price"]);
    v.variants.forEach((x, i) => parseMoneyInput(x.price) === null && bad(["variants", i, "price"]));
    v.modifierGroups.forEach((g, gi) => {
      g.options.forEach((o, oi) => parseMoneyInput(o.price) === null && bad(["modifierGroups", gi, "options", oi, "price"]));
      if (g.min > g.max) ctx.addIssue({ code: "custom", path: ["modifierGroups", gi, "min"], message: "Minimum cannot exceed maximum" });
      if (g.max > g.options.length) ctx.addIssue({ code: "custom", path: ["modifierGroups", gi, "max"], message: "Maximum cannot exceed the number of options" });
    });
  });

const strip = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/** Form values -> input for the Server Action (integer minor units). */
export function toProductInput(form) {
  const money = (text) => parseMoneyInput(text) ?? 0;
  return {
    categoryId: form.categoryId,
    name: form.name,
    description: form.description,
    priceMinor: form.variants.length > 0 ? 0 : money(form.price), // with variants the server derives the base price
    variants: form.variants.map((v) => strip({ id: v.id, name: v.name, priceMinor: money(v.price) })),
    modifierGroups: form.modifierGroups.map((g) =>
      strip({
        id: g.id, name: g.name, min: g.min, max: g.max,
        options: g.options.map((o) => strip({ id: o.id, name: o.name, priceMinor: money(o.price) })),
      }),
    ),
    dietary: form.dietary,
    prepTimeMinutes: form.prepTimeMinutes,
    featured: form.featured,
    available: form.available,
    visibility: form.visibility,
  };
}

/** Stored product (or a blank) -> form default values. */
export function toProductForm(product, categoryId = "") {
  if (!product) {
    return { categoryId, name: "", description: "", price: "", variants: [], modifierGroups: [], dietary: [], prepTimeMinutes: 0, featured: false, available: true, visibility: "PUBLIC" };
  }
  return {
    categoryId: product.categoryId,
    name: product.name,
    description: product.description ?? "",
    price: minorToInput(product.priceMinor),
    variants: (product.variants ?? []).map((v) => ({ id: v.id, name: v.name, price: minorToInput(v.priceMinor) })),
    modifierGroups: (product.modifierGroups ?? []).map((g) => ({
      id: g.id, name: g.name, min: g.min, max: g.max,
      options: g.options.map((o) => ({ id: o.id, name: o.name, price: minorToInput(o.priceMinor) })),
    })),
    dietary: product.dietary ?? [],
    prepTimeMinutes: product.prepTimeMinutes ?? 0,
    featured: product.featured === true,
    available: product.available !== false,
    visibility: product.visibility ?? "PUBLIC",
  };
}

/** Client-side list filter for the product table. */
export function filterProducts(products, { categoryId = "all", search = "", availability = "ALL", dietary = "ALL" } = {}) {
  const needle = search.trim().toLowerCase();
  return products.filter((p) => {
    if (categoryId !== "all" && p.categoryId !== categoryId) return false;
    if (availability === "AVAILABLE" && p.available === false) return false;
    if (availability === "UNAVAILABLE" && p.available !== false) return false;
    if (dietary !== "ALL" && !(p.dietary ?? []).includes(dietary)) return false;
    return !needle || p.name.toLowerCase().includes(needle) || (p.description ?? "").toLowerCase().includes(needle);
  });
}

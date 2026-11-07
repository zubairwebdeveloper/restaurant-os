/**
 * Turns validated product input into the stored shape.
 * - gives every variant, group and option a stable id (the POS refers to these ids);
 * - with variants, the base price becomes the lowest variant price ("from" price), so it can never disagree;
 * - removes the form-only "required" notion: a group is required when min >= 1.
 */
export function normalizeProduct(input, newId) {
  const withId = (item) => ({ ...item, id: item.id ?? newId() });
  const variants = input.variants.map(withId);
  const modifierGroups = input.modifierGroups.map((g) => ({
    ...withId(g),
    required: g.min >= 1,
    options: g.options.map(withId),
  }));
  const priceMinor = variants.length > 0 ? Math.min(...variants.map((v) => v.priceMinor)) : input.priceMinor;
  return { ...input, priceMinor, variants, modifierGroups };
}

export const defaultNewId = () => globalThis.crypto.randomUUID();

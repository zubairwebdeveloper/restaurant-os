export const DIETARY_LABELS = Object.freeze({
  VEGETARIAN: "Vegetarian",
  VEGAN: "Vegan",
  HALAL: "Halal",
  GLUTEN_FREE: "Gluten free",
  DAIRY_FREE: "Dairy free",
  CONTAINS_NUTS: "Contains nuts",
  SPICY: "Spicy",
});
export const DIETARY_KEYS = Object.freeze(Object.keys(DIETARY_LABELS));

export const VISIBILITY = Object.freeze(["PUBLIC", "PRIVATE"]);

export const LIMITS = Object.freeze({
  MAX_CATEGORIES: 50,
  MAX_PRODUCTS: 500,
  MAX_PRODUCTS_PER_CATEGORY: 100,
  MAX_VARIANTS: 10,
  MAX_MODIFIER_GROUPS: 10,
  MAX_OPTIONS_PER_GROUP: 20,
  MAX_PRICE_MINOR: 100_000_000, // 1,000,000.00 in a 2-decimal currency
  MAX_SNAPSHOT_BYTES: 800_000, // public menu document must stay well under Firestore's 1 MiB limit
});

/** All supported currencies use 2 decimal places, so prices are stored as integer "minor" units (paisa, cents). */
export const CURRENCIES = Object.freeze(["PKR", "USD", "EUR", "GBP", "AED", "SAR"]);
export const DEFAULT_CURRENCY = "PKR";

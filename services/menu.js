import { categories, menuItems } from "@/features/menu/data";

// Data-access layer. Phase 3 replaces the bodies with Firestore reads.
export async function getCategories() {
  return categories;
}

export async function getMenuItems({ category, featured } = {}) {
  return menuItems.filter(
    (i) => (!category || i.category === category) && (featured === undefined || i.featured === featured)
  );
}

export async function getMenuItemBySlug(slug) {
  return menuItems.find((i) => i.slug === slug) ?? null;
}

export async function getRelatedItems(item, limit = 3) {
  return menuItems.filter((i) => i.category === item.category && i.id !== item.id).slice(0, limit);
}

import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// UI-only test: the router, toasts and Server Actions are stubbed.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }) }));
vi.mock("sonner", () => ({ toast: { success: () => {}, error: () => {} } }));
vi.mock("@/app/dashboard/menu/actions", () => {
  const ok = async () => ({ ok: true });
  return { createCategoryAction: ok, updateCategoryAction: ok, deleteCategoryAction: ok, reorderCategoriesAction: ok, saveProductAction: ok, setAvailabilityAction: ok, deleteProductAction: ok, reorderProductsAction: ok, setMenuPublishedAction: ok };
});

const { default: MenuManager } = await import("@/features/menu/components/MenuManager");
const { default: ProductForm } = await import("@/features/menu/components/ProductForm");
const { default: CategoryForm } = await import("@/features/menu/components/CategoryForm");

const categories = [
  { id: "cat1", name: "Mains", description: "", visibility: "PUBLIC", sortOrder: 0 },
  { id: "cat2", name: "Staff only", description: "", visibility: "PRIVATE", sortOrder: 1 },
];
const products = [
  { id: "p1", categoryId: "cat1", name: "Chicken Karahi", priceMinor: 125000, variants: [], modifierGroups: [], dietary: ["HALAL"], available: true, featured: true, visibility: "PUBLIC", sortOrder: 0 },
  { id: "p2", categoryId: "cat1", name: "Dal Tadka", priceMinor: 40000, variants: [{ id: "v1", name: "Half", priceMinor: 40000 }], modifierGroups: [], dietary: [], available: false, featured: false, visibility: "PRIVATE", sortOrder: 1 },
];
const render = (meta = { version: 0, publishedVersion: null, published: false }, over = {}) =>
  renderToStaticMarkup(createElement(MenuManager, { categories, products, currency: "PKR", meta, ...over }));

describe("MenuManager rendering", () => {
  it("lists categories and products with prices, availability and labels", () => {
    const html = render();
    expect(html).toContain("Mains");
    expect(html).toContain("Staff only");
    expect(html).toContain("Chicken Karahi");
    expect(html).toContain("PKR 1,250.00");
    expect(html).toContain("from PKR 400.00"); // variants show a "from" price
    expect(html).toContain("Halal");
    expect(html).toContain("Sold out");
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-label="Reorder Mains');
    expect(html).toContain("All items");
  });

  it("shows the right publish state", () => {
    expect(render({ version: 0, publishedVersion: null, published: false })).toContain("Not published");
    expect(render({ version: 3, publishedVersion: null, published: false })).toContain("Publish menu");
    const live = render({ version: 4, publishedVersion: 4, published: true });
    expect(live).toContain("Menu is live");
    expect(live).toContain("Unpublish");
    expect(render({ version: 5, publishedVersion: 4, published: true })).toContain("Unpublished changes");
  });

  it("explains empty states and disables adding products without a category", () => {
    const noCats = render(undefined, { categories: [], products: [] });
    expect(noCats).toContain("No categories yet");
    expect(noCats).toContain("Create a category first");
    expect(noCats).toMatch(/<button[^>]*disabled[^>]*>(?:(?!<\/button>).)*Add product/);
    expect(render(undefined, { products: [] })).toContain("No products yet");
  });
});

describe("forms render", () => {
  it("ProductForm shows existing variants, modifiers and dietary labels", () => {
    const product = {
      id: "p9", categoryId: "cat1", name: "Pizza", description: "", priceMinor: 90000, available: true, featured: false, visibility: "PUBLIC", prepTimeMinutes: 15, dietary: ["VEGETARIAN"],
      variants: [{ id: "variant-aaaa", name: "Small", priceMinor: 90000 }, { id: "variant-bbbb", name: "Large", priceMinor: 150000 }],
      modifierGroups: [{ id: "group-aaaaa", name: "Toppings", min: 0, max: 2, options: [{ id: "opt-aaaaaa", name: "Olives", priceMinor: 5000 }] }],
    };
    const html = renderToStaticMarkup(createElement(ProductForm, { product, categories, currency: "PKR", onSubmit: async () => null, onCancel: () => {} }));
    expect(html).toContain("Edit product");
    // React Hook Form fills inputs after mount, so server HTML has the rows but not their values.
    expect(html).toContain('name="variants.0.name"');
    expect(html).toContain('name="variants.1.price"');
    expect(html).toContain("Remove variant 2");
    expect(html).toContain('name="modifierGroups.0.name"');
    expect(html).toContain('name="modifierGroups.0.options.0.name"');
    expect(html).not.toContain('name="modifierGroups.0.options.1.name"');
    expect(html).toContain("Remove group 1");
    expect(html).toContain("The base price is the lowest variant price");
    expect(html).toContain("Vegetarian");
    expect(html).toContain("Cancel");
  });

  it("ProductForm for a new product asks for a price and offers all categories", () => {
    const html = renderToStaticMarkup(createElement(ProductForm, { categories, defaultCategoryId: "cat1", currency: "PKR", onSubmit: async () => null, onCancel: () => {} }));
    expect(html).toContain("New product");
    expect(html).toContain("Price (PKR)");
    expect(html).toContain("Staff only");
  });

  it("CategoryForm renders for create and edit", () => {
    const html = renderToStaticMarkup(createElement(CategoryForm, { category: categories[0], onSubmit: async () => null, onCancel: () => {} }));
    expect(html).toContain("Edit category");
    expect(html).toContain('name="name"');
    expect(html).toContain("Private (staff only)");
    expect(renderToStaticMarkup(createElement(CategoryForm, { onSubmit: async () => null, onCancel: () => {} }))).toContain("New category");
  });
});

"use server";

import { FieldValue } from "firebase-admin/firestore";
import { requireTenantPermission } from "@/lib/auth/dal";
import { getAdminDb } from "@/lib/firebase/admin";
import * as menu from "@/lib/menu/menu";
import { toActionFailure } from "@/lib/utils/action-result";
import { availabilitySchema, categorySchema, idListSchema, idSchema, productSchema, reorderProductsSchema } from "@/schemas/menu.schema";
import { z } from "zod";

/**
 * Menu Server Actions. Each one requires MENU_MANAGE in the caller's verified active workspace.
 * The tenant id comes from the session, never from the browser, and input is validated with Zod.
 */
const MESSAGES = {
  LIMIT_REACHED: "You have reached the limit for this menu.",
  CATEGORY_NOT_EMPTY: "Move or delete the products in this category first.",
  CATEGORY_NOT_FOUND: "That category no longer exists.",
  PRODUCT_NOT_FOUND: "That product no longer exists.",
  INVALID_ORDER: "The list changed in the meantime. Refresh and try again.",
  MENU_TOO_LARGE: "The public menu is too large to publish. Hide or remove some items.",
};

async function guarded(work) {
  const { session, access } = await requireTenantPermission("MENU_MANAGE"); // redirects when not allowed
  try {
    const result = await work({
      db: getAdminDb(), tenantId: access.tenantId, actorUid: session.user.uid, serverTimestamp: FieldValue.serverTimestamp(),
    });
    return { ok: true, ...result };
  } catch (error) {
    return toActionFailure(error, MESSAGES);
  }
}

export async function createCategoryAction(input) {
  return guarded(({ db, ...ctx }) => menu.createCategory(db, { ...ctx, input: categorySchema.parse(input) }));
}

export async function updateCategoryAction({ categoryId, input }) {
  return guarded(({ db, ...ctx }) => menu.updateCategory(db, { ...ctx, categoryId: idSchema.parse(categoryId), input: categorySchema.parse(input) }));
}

export async function deleteCategoryAction({ categoryId }) {
  return guarded(({ db, ...ctx }) => menu.deleteCategory(db, { ...ctx, categoryId: idSchema.parse(categoryId) }));
}

export async function reorderCategoriesAction({ orderedIds }) {
  return guarded(({ db, ...ctx }) => menu.reorderCategories(db, { ...ctx, orderedIds: idListSchema.parse(orderedIds) }));
}

export async function saveProductAction({ productId, input }) {
  return guarded(({ db, ...ctx }) => {
    const data = productSchema.parse(input);
    return productId
      ? menu.updateProduct(db, { ...ctx, productId: idSchema.parse(productId), input: data })
      : menu.createProduct(db, { ...ctx, input: data });
  });
}

export async function setAvailabilityAction(input) {
  return guarded(({ db, ...ctx }) => menu.setProductAvailability(db, { ...ctx, ...availabilitySchema.parse(input) }));
}

export async function deleteProductAction({ productId }) {
  return guarded(({ db, ...ctx }) => menu.deleteProduct(db, { ...ctx, productId: idSchema.parse(productId) }));
}

export async function reorderProductsAction(input) {
  return guarded(({ db, ...ctx }) => menu.reorderProducts(db, { ...ctx, ...reorderProductsSchema.parse(input) }));
}

export async function setMenuPublishedAction(input) {
  return guarded(({ db, ...ctx }) => {
    const { published } = z.object({ published: z.boolean() }).parse(input);
    return published ? menu.publishMenu(db, ctx) : menu.unpublishMenu(db, ctx);
  });
}

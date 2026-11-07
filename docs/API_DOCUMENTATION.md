# API

All endpoints reject cross-site requests: a same-origin `Origin` header (or `Sec-Fetch-Site: same-origin`) is required.

## `POST /api/auth/session`
Body `{ "idToken": string }`. Verifies the ID token (revocation checked, sign-in within 5 minutes) and sets the `ros_session` httpOnly cookie.
Responses: `200 {ok:true}`, `400 INVALID_REQUEST | INVALID_TOKEN`, `401 INVALID_TOKEN | RECENT_SIGNIN_REQUIRED`, `403 FORBIDDEN`.

## `DELETE /api/auth/session`
Clears `ros_session` and `ros_tenant`. Responses: `200`, `403 FORBIDDEN`.

## `POST /api/tenants/active`
Body `{ "tenantId": string }`. Requires a valid session. Sets `ros_tenant` only if the user has an ACTIVE membership in an ACTIVE tenant.
Responses: `200`, `401 UNAUTHENTICATED`, `403 FORBIDDEN` (identical for unknown tenants and non-members, so tenants cannot be enumerated).

## Platform Server Actions (`app/platform/admin/actions.js`)
Called from the platform tables; each requires a session and an active `SUPER_ADMIN`, validates input with Zod, and returns `{ ok: true, ... }` or `{ ok: false, error }`.

| Action | Input | Effect |
|---|---|---|
| `approveApplicationAction` | `{ applicationId }` | Creates tenant + OWNER membership atomically; returns `{ tenantId }`. Idempotent |
| `rejectApplicationAction` | `{ applicationId, reason }` | Marks `REJECTED`; reason 5-500 chars |
| `suspendTenantAction` | `{ tenantId, reason }` | `ACTIVE` to `SUSPENDED`; reason 5-500 chars |
| `reactivateTenantAction` | `{ tenantId, reason? }` | `SUSPENDED` to `ACTIVE` |

## Onboarding and website Server Actions (Phase 5)
All return `{ ok: true, ... }` or `{ ok: false, error }`. Tenant-scoped actions use the caller's verified active workspace and require `SETTINGS_MANAGE`; they accept no tenant id from the browser.

| Action | File | Input | Effect |
|---|---|---|---|
| `submitApplicationAction` | `app/dashboard/apply/actions.js` | restaurant name, type, city, country, phone | Creates a PENDING application (one pending at a time, max 5) |
| `saveBrandingAction` | `app/dashboard/branding/actions.js` | template, fontPairing, primaryColor, tagline | Saves branding; refreshes the public copy if live |
| `saveWebsiteAction` | `app/dashboard/website/actions.js` | slug, hero, about, contact, hours, social, seo | Saves content; refreshes the public copy and moves the address if live |
| `setPublishedAction` | `app/dashboard/website/actions.js` | `{ published: boolean }` | Publishes (reserves the address, writes the public copy) or unpublishes (removes it, releases the address) |

Public page: `GET /r/{slug}` (no authentication). Returns the restaurant's site only while it is published and its tenant is ACTIVE.

## Menu Server Actions (Phase 6, `app/dashboard/menu/actions.js`)
All require `MENU_MANAGE` in the caller's verified active workspace, accept no tenant id, validate with Zod, and return `{ ok: true, ... }` or `{ ok: false, error }`.

| Action | Input |
|---|---|
| `createCategoryAction` | `{ name, description?, visibility? }` |
| `updateCategoryAction` | `{ categoryId, input }` |
| `deleteCategoryAction` | `{ categoryId }` (fails with a message if the category still has products) |
| `reorderCategoriesAction` | `{ orderedIds }` (must be exactly the existing ids) |
| `saveProductAction` | `{ productId?, input }` (create when `productId` is omitted; prices in integer minor units) |
| `setAvailabilityAction` | `{ productId, available }` |
| `deleteProductAction` | `{ productId }` |
| `reorderProductsAction` | `{ categoryId, orderedIds }` |
| `setMenuPublishedAction` | `{ published: boolean }` |

## POS, orders and settings Server Actions (Phase 7)
All use the caller's verified active workspace; none accepts a tenant id, prices or totals from the browser. Errors return `{ ok: false, error }` with a readable message.

| Action | File | Permission | Input |
|---|---|---|---|
| `placeOrderAction` | `app/dashboard/pos/actions.js` | `POS_CREATE` (+ `POS_DISCOUNT` if discounting) | `{ clientOrderId: uuid, order: { type, tableLabel?, customer?, lines[{productId, variantId?, selections[], quantity, note?}], discount?, note? } }` |
| `payOrderAction` | `app/dashboard/pos/actions.js` | `POS_CREATE` | `{ orderId, paymentRequestId: uuid, payments[{method, amountMinor, tenderedMinor?}] }`; returns the updated order |
| `cancelOrderAction` | `app/dashboard/orders/actions.js` | `ORDERS_UPDATE` | `{ orderId, reason }` |
| `refundOrderAction` | `app/dashboard/orders/actions.js` | `ORDERS_REFUND` | `{ orderId, refundRequestId: uuid, amountMinor, method, reason }` |
| `updateFulfilmentAction` | `app/dashboard/orders/actions.js` | `ORDERS_UPDATE` or `KITCHEN_UPDATE` | `{ orderId, status }` |
| `saveSettingsAction` | `app/dashboard/settings/actions.js` | `SETTINGS_MANAGE` | currency, tax %, service %, labels, footer |

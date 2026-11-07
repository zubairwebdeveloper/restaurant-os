# Menu and product management (Phase 6)

Page: `/dashboard/menu` (requires `MENU_MANAGE`: Owner and Manager by default; cashiers, chefs and waiters cannot open it).

## What it does
- **Categories**: name, description, public/private visibility, drag-and-drop order, deletion only when empty.
- **Products**: name, description, price, **variants** (sizes with their own price), **modifier groups** (add-ons/choices with min/max and priced options), **dietary labels** (vegetarian, vegan, halal, gluten free, dairy free, contains nuts, spicy), preparation time, featured flag, availability ("sold out") switch, public/private visibility.
- **Ordering**: categories and the products inside a category reorder by pointer, touch or keyboard (focus the handle, press space, use the arrow keys). Reordering is disabled while a search or filter is active.
- **Search and filters**: by text, availability and dietary label.
- **Publishing**: menu edits are private until you press *Publish menu*. Publishing copies only PUBLIC items in PUBLIC categories (empty categories are dropped) into one document, `publicMenus/{tenantId}`, which the public site at `/r/{slug}` reads (3 reads per page view instead of hundreds). A badge shows "Unpublished changes" when the draft differs from what is live. Availability changes also need *Publish changes* to reach the website.

## Money
Prices are **integer minor units** (1250 = 12.50) so no floating-point error can occur. All supported currencies (PKR, USD, EUR, GBP, AED, SAR) use 2 decimals. The currency is `tenants/{id}.settings.currency` (default PKR; change it in Settings, Phase 7). With variants, the product's base price is always the lowest variant price (set by the server).

## Data
`tenants/{id}/categories/{id}`, `tenants/{id}/products/{id}`: every document has `tenantId`, `sortOrder`, timestamps. Variants, modifier groups and options get stable ids assigned by the server (the POS will reference them in Phase 7). `tenants/{id}.menuMeta`: `{ version, publishedVersion, published, productCount }`.

## Security
- Firestore rules make menu collections **read-only for clients**; every write goes through Server Actions (`app/dashboard/menu/actions.js`), which require `MENU_MANAGE` in the caller's verified active workspace, validate with Zod (integer prices, limits, no unknown fields), and run one transaction scoped to that tenant's paths. A category or product id from another tenant simply does not exist in the caller's paths.
- Every change writes a tenant audit log entry (`MENU_CHANGED`, `MENU_PUBLISHED`, `MENU_UNPUBLISHED`).
- `publicMenus` is server-only; suspending a restaurant sets its status to `SUSPENDED` and the public page stops serving it.

## Limits
50 categories, 500 products (100 per category), 10 variants, 10 modifier groups with up to 20 options each, public menu document under 800 KB.

## Known limits
- **No product images** (Cloud Storage needs the Blaze plan; the decision is still open).
- Menu changes by two people at once are last-write-wins per product.
- The "menus" collection (separate named menus, e.g. breakfast/dinner) and time-based availability are not built.
- Editors have not been used in a real browser: only server-side rendering and the data logic are tested. Drag-and-drop, the product form's interaction and focus handling are unverified.
- Nothing has run against real Firebase or the emulators.

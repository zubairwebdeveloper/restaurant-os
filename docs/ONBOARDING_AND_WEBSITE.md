# Restaurant onboarding and website CMS (Phase 5)

## Onboarding flow
1. Owner registers and verifies their email (Phase 3).
2. `/dashboard/apply`: the owner submits an application (`submitApplicationAction`). The server validates it, takes the owner id from the **session** (never from the form), allows only **one PENDING application at a time** and **5 in total**, and writes a `PENDING` application plus an `APPLICATION_SUBMITTED` audit entry. That entry is what platform admins see in "Recent activity"; the Applications page and the pending count on the overview also surface it. There is no email or push notification yet.
3. A SUPER_ADMIN approves or rejects it (Phase 4). Approval creates the tenant and the OWNER membership atomically.
4. The owner's dashboard now opens their workspace; `/dashboard` shows the status of every application until then.

Not included: staff invitations (`/invite`). They need server-side membership creation and are planned with employee management.

## Website CMS
Owners (members with `SETTINGS_MANAGE`) edit two sections, each in its own page with a live preview:
- **Branding** (`/dashboard/branding`): template (5), brand colour, typography, tagline. Colours that fail WCAG AA text contrast (4.5:1) are rejected.
- **Website** (`/dashboard/website`): web address, hero, about, contact, opening hours, social links, SEO title/description, publish/unpublish.

Saves go through Server Actions that re-verify the active tenant and `SETTINGS_MANAGE`, validate with Zod, and run in one transaction. The tenant id is taken from the verified session, never from the browser. Firestore rules no longer let clients write `branding`/`website`/`profile` directly (only `settings`).

### Data
- `tenants/{id}.branding` and `.website`: the owner's saved settings (draft or live). `website.published` is set only by publish/unpublish.
- `publicProfiles/{id}`: the public copy, present only while published. Contains only publishable fields (name, slug, branding, hero, about, contact, hours, social, SEO). Hidden automatically when the tenant is suspended (status mirrored by the Phase 4 lifecycle code; rules allow public reads only when `status == "ACTIVE"`).
- `tenantSlugs/{slug}`: reserves an address for one tenant. Reserved when publishing, moved when a live site's address changes, released on unpublish. Server-only.

### Public site
`/r/{slug}` renders any restaurant from data plus a template (`config/restaurant-templates.js`): Premium Restaurant, Modern Cafe, Fast Food, Fine Dining, Hotel Restaurant. Template colours are scoped to the site and independent of the dashboard theme. Text is escaped by React and links are shown only if they are real `https://` URLs (checked on save and again when rendering). Slugs are validated (3-40 lowercase letters, digits, single hyphens, not reserved) before they ever reach a document path.

## Decisions and limits
- **No image uploads yet.** Cloud Storage needs the Blaze plan (see `STORAGE_STRUCTURE.md`); the storage decision is still open, so this phase uses colour, type and text only. No logo, favicon or photos. Templates use a coloured panel instead of imagery.
- **Subdomains are not implemented.** Sites live at `/r/{slug}`. Subdomains (`slug.yourdomain.com`) need wildcard DNS and a host rewrite in `proxy.js`; custom domains need DNS and hosting setup. Both are planned as optional later work.
- The public site now shows the published menu (Phase 6, see `MENU.md`). Reservation and ordering buttons arrive with Phases 7-8. The hero button is a plain https link the owner supplies.
- **Unknown addresses return HTTP 200 with a "not found" page and `noindex`** (a soft 404), because the page streams inside a Suspense boundary under Cache Components.
- Public pages read Firestore on every request (no caching yet). Add caching before public traffic grows, to protect the free read quota.
- A `time` input shows the browser's locale format but stores 24-hour `HH:MM`. Overnight closing times (for example 02:00) are accepted as entered.
- Nothing has run against real Firebase or the emulators. The new rules tests (public profiles, slug reservations, tighter tenant updates) are written but not executed.

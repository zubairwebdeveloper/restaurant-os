# Restaurant OS

A modern, multi-tenant Restaurant Management System (RMS) designed to
run restaurant operations from one connected platform --- from the
customer-facing website and online orders to POS, kitchen workflows,
tables, inventory, staff, and financial reporting.

> **Project status:** Active development / evolving product
> specification. This README describes the target product, design
> direction, architecture, and planned capabilities. A feature should
> not be considered production-ready until it has been implemented,
> tested, and enabled in the deployment.

------------------------------------------------------------------------

## Table of Contents

1.  [Product Vision](#product-vision)
2.  [Product Goals](#product-goals)
3.  [Design Direction](#design-direction)
4.  [Technology Stack](#technology-stack)
5.  [System Architecture](#system-architecture)
6.  [Applications and Modules](#applications-and-modules)
7.  [User Roles and Permissions](#user-roles-and-permissions)
8.  [Core Workflows](#core-workflows)
9.  [Data Architecture](#data-architecture)
10. [UI and UX Standards](#ui-and-ux-standards)
11. [Security and Reliability](#security-and-reliability)
12. [Offline-First Strategy](#offline-first-strategy)
13. [Project Structure](#project-structure)
14. [Getting Started](#getting-started)
15. [Environment Variables](#environment-variables)
16. [Development Commands](#development-commands)
17. [Testing and Quality](#testing-and-quality)
18. [Deployment](#deployment)
19. [Development Roadmap](#development-roadmap)
20. [Contribution Guidelines](#contribution-guidelines)

------------------------------------------------------------------------

## Product Vision

Restaurant OS aims to give independent restaurants, cafes, hotels, and
restaurant groups the operational tools usually spread across multiple
disconnected applications.

The platform is designed around three connected experiences:

-   **Customer experience:** a fast, polished website for discovering
    the restaurant, browsing the menu, making reservations, and placing
    orders.
-   **Operations experience:** a focused workspace for cashiers,
    waiters, kitchen staff, managers, and inventory teams.
-   **Business management experience:** a secure owner/admin dashboard
    for managing branches, staff, menus, pricing, stock, expenses,
    reports, and settings.

The long-term goal is a configurable SaaS product where multiple
restaurant businesses can operate independently while sharing the same
application infrastructure.

## Product Goals

-   Replace disconnected restaurant tools with one consistent system.
-   Reduce order mistakes and communication delays between service staff
    and the kitchen.
-   Give managers a live view of orders, tables, stock, and business
    performance.
-   Support one restaurant today and multiple branches or restaurant
    tenants as the product grows.
-   Keep the interface usable on desktop POS terminals, tablets, and
    mobile devices.
-   Provide resilient workflows when internet connectivity is unstable.
-   Make business data private to the correct tenant and branch.
-   Keep the system modular so new modules can be introduced without
    rewriting the platform.

------------------------------------------------------------------------

## Design Direction

### Visual identity

The interface should feel like a premium, modern restaurant product:
calm, clear, confident, and operationally efficient. It should look like
a professional SaaS application rather than a generic admin template.

**Design principles**

-   Clean layouts with strong typography and generous spacing.
-   Clear visual hierarchy: page title, key actions, summary metrics,
    then detailed content.
-   Neutral surfaces for long working sessions, with a restrained accent
    color for primary actions.
-   Use color to communicate state, not merely decoration.
-   Consistent cards, borders, radii, shadows, form fields, dialogs, and
    menus.
-   Subtle motion for transitions and feedback; never let animation slow
    down POS or kitchen work.
-   Responsive layouts that adapt to desktop, tablet, and mobile.
-   Accessible contrast, visible focus states, keyboard navigation, and
    readable labels.

### Suggested design tokens

These are starting tokens. Keep them centralized so the product can be
rebranded without editing every component.

  Token                Suggested value   Usage
  -------------------- ----------------- ----------------------------------------------
  Primary              `#FACC15`         Main action, selected navigation, highlights
  Primary foreground   `#18181B`         Text/icons on primary surfaces
  App background       `#F8FAFC`         Main light application background
  Surface              `#FFFFFF`         Cards, dialogs, panels
  Text                 `#18181B`         Main content
  Muted text           `#71717A`         Secondary labels and helper text
  Border               `#E4E4E7`         Dividers, inputs, card outlines
  Success              `#16A34A`         Completed, paid, available
  Warning              `#D97706`         Pending, low stock, attention
  Destructive          `#DC2626`         Cancelled, failed, critical stock
  Info                 `#2563EB`         Informational states

Use semantic CSS variables rather than hardcoding colors throughout the
codebase. Dark mode should use a separately tuned token set, not a
simple color inversion.

### Typography

-   Use a modern sans-serif family such as **DM Sans** for application
    UI.
-   Use a complementary serif display face such as **Source Serif 4**
    only where the public restaurant brand benefits from an editorial
    feel.
-   Keep POS and kitchen typography highly legible at a distance.
-   Use tabular numerals for prices, quantities, timers, and financial
    values.

### Layout patterns

-   **Admin dashboard:** collapsible sidebar, top header, breadcrumbs,
    page actions, responsive content grid.
-   **POS:** full-height workspace, category navigation, product grid,
    persistent order/cart panel.
-   **Kitchen display:** high-contrast order columns, large status
    labels, elapsed-time indicators, minimal navigation.
-   **Table operations:** visual floor plan or table grid, clear
    occupancy and order states.
-   **Public website:** branded hero, menu highlights, restaurant story,
    gallery, location/contact, and strong order/reservation calls to
    action.

### Interaction and motion

-   Use Framer Motion for restrained page transitions, drawers, and
    micro-interactions.
-   Use skeletons for loading states and optimistic feedback only when
    the action can be safely reconciled.
-   Use confirmation dialogs for destructive or financially significant
    actions.
-   Preserve unsaved form data when opening secondary dialogs.
-   Respect `prefers-reduced-motion`.
-   Never rely on color alone to communicate order or payment status.

------------------------------------------------------------------------

## Technology Stack

The project uses a JavaScript-first Next.js architecture.

  -----------------------------------------------------------------------
  Area                    Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Framework               Next.js App Router      Routing, layouts,
                                                  server rendering, route
                                                  handlers

  Language                JavaScript / JSX        Application code; no
                                                  TypeScript requirement

  UI                      React                   Component-driven
                                                  interfaces

  Styling                 Tailwind CSS            Utility-first styling
                                                  and responsive layouts

  Components              shadcn/ui + Radix UI    Accessible reusable
                                                  primitives

  Icons                   Lucide React            Consistent interface
                                                  icons

  Motion                  Framer Motion           Subtle interface
                                                  animation

  Forms                   React Hook Form + Zod   Form state and schema
                                                  validation

  Data tables             TanStack Table /        Dense operational and
                          Virtual                 admin tables

  Drag and drop           dnd-kit                 Reordering and
                                                  interactive layouts

  Charts                  Recharts                Analytics and financial
                                                  visualizations

  Client state            Zustand                 Local UI and workflow
                                                  state

  Server state            Firebase SDK /          Persistent application
                          application services    data

  Authentication          Firebase Authentication User identity and
                                                  sign-in

  Database                Cloud Firestore         Tenant, branch, menu,
                                                  order, and operational
                                                  data

  File storage            Firebase Storage        Menu images, logos, and
                                                  documents

  Server security         Firebase Admin SDK      Trusted server-side
                                                  operations

  Local persistence       IndexedDB + Dexie       Offline queue and local
                                                  operational cache

  Validation              Zod                     Shared input validation

  Unit/component tests    Vitest                  Logic and component
                                                  testing

  End-to-end tests        Playwright              Critical user journeys

  Monitoring              Sentry (planned)        Runtime and production
                                                  error monitoring

  Hosting                 Vercel                  Next.js deployment
  -----------------------------------------------------------------------

**Important:** Keep Firebase Admin SDK code server-only. Never expose
service account credentials or privileged server configuration to the
browser.

------------------------------------------------------------------------

## System Architecture

The system is organized into clear application layers:

1.  **Presentation layer:** public pages, admin dashboard, POS, kitchen
    display, and table operations.
2.  **Feature layer:** menu, orders, reservations, inventory, staff,
    payments, and reporting modules.
3.  **Application/service layer:** business rules, permissions,
    validation, and workflow orchestration.
4.  **Data access layer:** Firestore repositories and Firebase Storage
    services.
5.  **Infrastructure layer:** Firebase Authentication, Firestore
    Security Rules, App Check, server-side Admin SDK, monitoring, and
    deployment.

### Multi-tenant model

A tenant represents one restaurant business or restaurant group. A
tenant can own one or more branches.

``` text
Platform
└── Tenant (Restaurant Business)
    ├── Branch A
    │   ├── Staff
    │   ├── Tables
    │   ├── Orders
    │   ├── Menu availability
    │   └── Inventory
    └── Branch B
        ├── Staff
        ├── Tables
        ├── Orders
        └── Inventory
```

Every tenant-owned record must carry a tenant identifier.
Branch-specific records should also carry a branch identifier. All reads
and writes must verify that the authenticated user is authorized for the
requested tenant and branch.

### Recommended application boundaries

-   Public routes must never expose private operational records.
-   Client components should call feature services, not scatter
    Firestore queries across the UI.
-   Server routes must validate identity, tenant membership,
    permissions, and input.
-   Financial and inventory changes should be recorded as auditable
    transactions.
-   Critical workflows should be idempotent where retries are possible.

------------------------------------------------------------------------

## Applications and Modules

### 1. Public Restaurant Website

A branded, mobile-first website for each restaurant.

**Pages and content**

-   Home page with hero image, restaurant introduction, featured dishes,
    and primary calls to action.
-   About page with restaurant story, values, and team/chef
    introduction.
-   Menu page with categories, item descriptions, prices, dietary
    labels, and availability.
-   Item detail or quick-view experience with image, options, and
    add-to-order action.
-   Gallery page for food, dining areas, events, and restaurant
    atmosphere.
-   Reservation page with date, time, party size, and contact details.
-   Contact/location page with address, phone, opening hours, map, and
    social links.
-   Order tracking page for supported online-order workflows.
-   Privacy policy, terms, and cancellation/refund information where
    applicable.

**Content guidelines**

-   Use real restaurant photography wherever possible.
-   Write short, specific dish descriptions rather than generic
    marketing text.
-   Show current prices and availability from the restaurant's managed
    menu data.
-   Display opening hours and contact details consistently.
-   Make phone, directions, reservations, and ordering easy to find.
-   Optimize images and metadata for SEO and fast loading.

### 2. Owner / Admin Dashboard

The central management workspace.

**Dashboard overview**

-   Today's sales and order count.
-   Average order value.
-   Active, completed, and cancelled orders.
-   Table occupancy and reservation summary.
-   Low-stock and out-of-stock alerts.
-   Sales trend and popular menu items.
-   Recent activity and important operational alerts.

**Management modules**

-   Restaurant profile and branding.
-   Branch management.
-   User accounts, staff invitations, roles, and permissions.
-   Menu categories and menu items.
-   Product modifiers, add-ons, sizes, and variants.
-   Pricing, taxes, service charges, and discounts.
-   Order management and order history.
-   Reservations and customer records.
-   Table and floor management.
-   Inventory, stock movements, and suppliers.
-   Purchase orders and receiving.
-   Expenses and cash movements.
-   Reports and exports.
-   Notification preferences and audit logs.
-   Subscription and billing settings (SaaS phase).

### 3. Point of Sale (POS)

A fast interface for creating and managing in-person orders.

**Core features**

-   Search menu items and browse categories.
-   Add items, modifiers, notes, and quantities to an order.
-   Select dine-in, takeaway, or delivery order type.
-   Assign a table, waiter, and customer when relevant.
-   Apply authorized discounts and service charges.
-   Calculate subtotal, tax, discount, and total transparently.
-   Split bills and support partial payments (subject to payment
    integration).
-   Print or share receipts where supported.
-   Hold, resume, edit, and cancel orders with permission checks.
-   Send confirmed orders to the kitchen.
-   View order status without leaving the POS workspace.

**POS UX requirements**

-   Minimize clicks for common tasks.
-   Keep the current order visible.
-   Make item availability obvious.
-   Prevent accidental duplicate submissions.
-   Require confirmation for voids, refunds, and sensitive adjustments.
-   Support keyboard-friendly operation and touch targets.

### 4. Kitchen Display System (KDS)

A live workspace for kitchen staff.

**Core features**

-   Receive confirmed kitchen tickets.
-   Group items by preparation station where configured.
-   Show order number, order type, table, item quantities, and notes.
-   Display elapsed preparation time.
-   Move tickets through configurable statuses such as `NEW`,
    `PREPARING`, `READY`, and `SERVED`.
-   Highlight delayed tickets.
-   Preserve a clear history of completed tickets.
-   Notify service staff when an order is ready.

Kitchen screens should be optimized for large displays, high
readability, and minimal interaction.

### 5. Table and Floor Management

A workspace for seating and dine-in operations.

**Core features**

-   Create and edit tables.
-   Configure floor areas and table capacity.
-   View available, occupied, reserved, and cleaning states.
-   Assign a waiter or service section.
-   Start an order from a table.
-   Move or merge tables with appropriate permissions.
-   Transfer an order between tables.
-   Track table duration and current bill.
-   Mark tables ready for the next guests after checkout.

### 6. Reservations

**Core features**

-   Create, update, confirm, and cancel reservations.
-   Capture guest name, contact, party size, date, and time.
-   Assign a table or seating area.
-   Track statuses such as `PENDING`, `CONFIRMED`, `SEATED`,
    `COMPLETED`, and `CANCELLED`.
-   Prevent conflicting reservations based on configured capacity and
    time rules.
-   Record special requests and internal notes.
-   Send confirmation/reminder notifications when a provider is
    configured.

### 7. Menu and Catalog Management

**Menu category fields**

-   Name and slug.
-   Description.
-   Image.
-   Display order.
-   Active/inactive status.
-   Branch availability.

**Menu item fields**

-   Name, slug, description, and image.
-   Category reference.
-   Base price and optional sale price.
-   Variants, sizes, and add-ons.
-   Dietary/allergen labels where verified.
-   Preparation station.
-   Availability schedule.
-   Active/inactive and sold-out state.
-   Branch-specific price or availability overrides when required.

### 8. Inventory and Stock Management

**Core features**

-   Ingredients and stock items.
-   Units of measure and conversion rules.
-   Current stock and reorder threshold.
-   Supplier directory.
-   Purchase orders and goods receiving.
-   Stock adjustments with reason codes.
-   Waste and spoilage tracking.
-   Stock movement history.
-   Low-stock and out-of-stock alerts.
-   Recipe/BOM mapping to estimate ingredient consumption from sold
    items (advanced phase).

Stock changes must be traceable. Avoid silently overwriting quantities;
record movements with actor, timestamp, reason, and source.

### 9. Staff and Access Management

-   Invite and deactivate staff.
-   Assign roles and branch access.
-   Manage permissions at feature/action level.
-   Track staff activity for sensitive operations.
-   Support secure password and account recovery through Firebase
    Authentication.
-   Avoid sharing accounts between employees.

### 10. Customers and Loyalty (planned)

-   Customer profiles and contact preferences.
-   Order history.
-   Reservation history.
-   Notes and service preferences.
-   Loyalty points and rewards.
-   Promotional campaigns and customer segments.
-   Consent-aware marketing preferences.

### 11. Payments and Cash Management

Payment methods depend on the selected provider and country.

-   Cash, card, and configured digital payment methods.
-   Payment status and transaction reference.
-   Partial payments and split tenders.
-   Refund and void workflows with authorization.
-   Cash drawer opening/closing records.
-   Shift reconciliation.
-   Expected versus counted cash.
-   Tax and service-charge configuration.
-   Daily sales and payment-method summaries.

Do not store raw card numbers, CVV values, or other sensitive card data
in Firestore. Use a compliant payment provider and store only safe
references and transaction metadata.

### 12. Reports and Analytics

-   Daily, weekly, and monthly sales.
-   Sales by branch, channel, category, and item.
-   Order volume and average order value.
-   Payment method breakdown.
-   Discounts, refunds, and voids.
-   Best-selling and low-performing items.
-   Inventory valuation and stock movement.
-   Expenses and operating summaries.
-   Staff activity and shift reports.
-   CSV/PDF exports where implemented.

Reports must clearly define date ranges, timezone, tax treatment, and
whether cancelled/refunded orders are included.

### 13. Multi-Restaurant SaaS Administration

A platform-level control area, separate from each restaurant's own
dashboard.

**Planned capabilities**

-   Tenant registration and onboarding.
-   Owner account creation.
-   Manual or automated tenant approval.
-   Tenant activation, suspension, and status management.
-   Subscription plans and feature entitlements.
-   Usage limits and billing integration.
-   Platform-wide operational overview.
-   Support access with strict audit trails.
-   Tenant isolation and branch-level access controls.

Platform administrators should not casually browse restaurant business
data. Any exceptional support access should be explicitly authorized and
audited.

------------------------------------------------------------------------

## User Roles and Permissions

Roles are starting presets. The permission system should remain flexible
so each tenant can configure access safely.

  -----------------------------------------------------------------------
  Role                                Typical access
  ----------------------------------- -----------------------------------
  Platform Super Admin                Platform configuration, tenant
                                      lifecycle, SaaS controls

  Restaurant Owner                    Full access to their tenant and
                                      authorized branches

  Restaurant Admin                    Operational and staff management
                                      within assigned scope

  Branch Manager                      Branch dashboard, staff, orders,
                                      stock, and reports

  Cashier                             POS, payments, receipts, and
                                      permitted order actions

  Waiter / Server                     Tables, dine-in orders, and order
                                      status

  Kitchen Staff                       Kitchen tickets and preparation
                                      status

  Inventory Manager                   Stock, suppliers, purchase orders,
                                      and adjustments

  Accountant                          Financial records, expenses,
                                      reconciliation, and reports

  Instructor / Custom Role            Optional configurable role for
                                      future specialized workflows
  -----------------------------------------------------------------------

**Authorization rules**

-   Apply least-privilege access by default.
-   Validate permissions on the server for every protected operation.
-   A hidden button is not a security boundary.
-   Check both tenant membership and branch scope.
-   Log sensitive actions such as refunds, voids, role changes, and
    stock adjustments.
-   Never trust a tenant or role identifier supplied only by the
    browser.

------------------------------------------------------------------------

## Core Workflows

### Dine-in order

1.  Waiter selects an available table.
2.  Waiter creates an order and adds menu items/modifiers.
3.  POS validates prices and availability.
4.  Authorized staff confirm the order.
5.  Kitchen receives the ticket.
6.  Kitchen updates preparation status.
7.  Service staff receive the ready status.
8.  Cashier processes payment.
9.  Order is closed and table becomes available after service/cleaning.

### Takeaway / delivery order

1.  Staff or customer selects the order channel.
2.  Items, quantities, modifiers, and customer details are captured.
3.  System validates the order and calculates totals.
4.  Payment is recorded or marked as due.
5.  Kitchen prepares the order.
6.  Staff marks it ready, dispatched, or collected.
7.  Order is completed with a full status history.

### Reservation

1.  Guest submits a reservation request.
2.  System checks configured seating capacity and availability.
3.  Staff confirms or declines the request.
4.  Guest receives a notification if messaging is configured.
5.  Staff marks the guest as seated on arrival.
6.  Reservation is completed or cancelled with a recorded reason.

### Stock receiving

1.  Inventory manager creates a purchase order.
2.  Supplier and expected quantities are recorded.
3.  Received quantities are checked.
4.  Stock movement entries are created.
5.  Purchase order is marked partially or fully received.
6.  Cost and supplier records are retained for reporting.

### End-of-shift reconciliation

1.  Cashier records opening cash.
2.  Sales and payment transactions accumulate during the shift.
3.  Cashier counts closing cash.
4.  System calculates expected cash and variance.
5.  Manager reviews and approves exceptions.
6.  Reconciliation is locked with an audit record.

------------------------------------------------------------------------

## Data Architecture

Use tenant-scoped collections and consistent document fields. The exact
Firestore schema may evolve as modules are implemented.

### Suggested top-level collections

``` text
tenants/{tenantId}
  branches/{branchId}
  members/{userId}
  invitations/{invitationId}
  roles/{roleId}
  categories/{categoryId}
  menuItems/{menuItemId}
  tables/{tableId}
  reservations/{reservationId}
  orders/{orderId}
  customers/{customerId}
  inventoryItems/{itemId}
  stockMovements/{movementId}
  suppliers/{supplierId}
  purchaseOrders/{purchaseOrderId}
  expenses/{expenseId}
  shifts/{shiftId}
  payments/{paymentId}
  auditLogs/{logId}
  settings/{documentId}

platformUsers/{userId}
platformAuditLogs/{logId}
```

This is a logical starting point, not a mandate to nest every collection
exactly this way. Choose collection placement based on query patterns,
security rules, data growth, and Firestore limits.

### Common document fields

``` js
{
  tenantId: "tenant_id",
  branchId: "branch_id", // when branch-scoped
  status: "ACTIVE",
  createdAt: serverTimestamp(),
  createdBy: "user_id",
  updatedAt: serverTimestamp(),
  updatedBy: "user_id"
}
```

### Order record concept

``` js
{
  tenantId: "tenant_id",
  branchId: "branch_id",
  orderNumber: "A-1024",
  orderType: "DINE_IN", // TAKEAWAY | DELIVERY
  tableId: "table_id",
  customerId: null,
  items: [
    {
      menuItemId: "item_id",
      nameSnapshot: "Example dish",
      quantity: 2,
      unitPrice: 850,
      modifiers: [],
      notes: ""
    }
  ],
  subtotal: 1700,
  discountTotal: 0,
  taxTotal: 0,
  serviceCharge: 0,
  grandTotal: 1700,
  paymentStatus: "UNPAID",
  orderStatus: "NEW",
  createdAt: "server timestamp",
  createdBy: "user_id"
}
```

Store price/name snapshots on order items so historical receipts remain
correct if the menu changes later. Use integer minor currency units
where appropriate, or a carefully defined decimal strategy; do not rely
on floating-point arithmetic for money.

### Data integrity guidelines

-   Generate important order numbers safely per tenant/branch.
-   Use Firestore transactions or batched writes for related updates.
-   Make payment and stock operations idempotent.
-   Keep an immutable or append-only history for financial and stock
    movements.
-   Define indexes for real query patterns.
-   Avoid unbounded arrays and oversized documents.
-   Plan archival/retention policies for high-volume records.

------------------------------------------------------------------------

## UI and UX Standards

### Every page should include

-   A clear page title and short purpose statement.
-   A primary action where relevant.
-   Loading, empty, error, and success states.
-   Responsive behavior.
-   Permission-aware actions.
-   Form validation with helpful error messages.
-   Consistent spacing and component patterns.

### Data tables

-   Search, filters, sorting, and pagination.
-   Column visibility when tables are dense.
-   Useful empty states and reset-filter actions.
-   Responsive alternatives for narrow screens.
-   Confirmation for destructive bulk actions.
-   Accessible row actions and keyboard support.

### Forms

-   React Hook Form with Zod schemas.
-   Clear required/optional field indicators.
-   Inline field errors and server error feedback.
-   Disabled/loading submit states.
-   Prevent duplicate submissions.
-   Preserve user input when safe to do so.

### Feedback states

Use consistent labels and visual treatments for:

-   Draft
-   Pending
-   Confirmed
-   In progress
-   Ready
-   Completed
-   Paid / Unpaid / Partially paid
-   Cancelled
-   Failed
-   Refunded

------------------------------------------------------------------------

## Security and Reliability

Security must be designed into every feature, not added at the end.

-   Firebase Authentication for identity.
-   Firestore Security Rules for client access.
-   Firebase Admin SDK for trusted server-side actions.
-   Firebase App Check where supported.
-   Server-side validation for all sensitive mutations.
-   Zod validation for untrusted input.
-   Role-based and branch-scoped authorization.
-   Rate limiting for authentication-adjacent and public endpoints.
-   Secure HTTP-only cookies for custom sessions where used.
-   Environment variables for secrets; never commit `.env.local`.
-   Audit logs for sensitive administrative and financial actions.
-   Backups and a documented recovery process.
-   Error monitoring and structured server logs.
-   Safe error messages that do not leak secrets or internal stack
    traces.

### Financial and operational safeguards

-   Do not mark an order paid merely because the browser says payment
    succeeded.
-   Verify payment-provider webhooks on the server.
-   Verify webhook signatures and prevent replay/duplicate processing.
-   Do not allow unauthorized edits to completed financial records.
-   Require a reason and permission for refunds, voids, and manual stock
    changes.
-   Record who performed an action and when.

------------------------------------------------------------------------

## Offline-First Strategy

Restaurants may have unreliable internet connectivity. The product
should degrade gracefully instead of losing work.

**Planned approach**

-   Cache permitted menu and reference data locally.
-   Use IndexedDB through Dexie for local operational data and queued
    mutations.
-   Clearly show online/offline/syncing states.
-   Queue supported actions while offline.
-   Assign stable client-generated operation IDs to prevent duplicate
    writes.
-   Retry safely when connectivity returns.
-   Show sync conflicts and require resolution when automatic merging is
    unsafe.
-   Keep sensitive data out of shared or unmanaged devices where
    possible.

**Important limitation:** Offline support must be explicitly implemented
and tested per workflow. Do not advertise the entire system as
offline-capable until POS, order synchronization, payment behavior, and
conflict handling have been verified.

------------------------------------------------------------------------

## Project Structure

A suggested feature-oriented structure for the Next.js App Router
project:

``` text
restaurant-os/
├── app/
│   ├── (marketing)/
│   ├── (auth)/
│   ├── (dashboard)/
│   ├── pos/
│   ├── kitchen/
│   ├── tables/
│   ├── api/
│   ├── layout.js
│   └── globals.css
├── components/
│   ├── ui/
│   ├── shared/
│   ├── layout/
│   ├── marketing/
│   └── dashboard/
├── features/
│   ├── auth/
│   ├── tenants/
│   ├── branches/
│   ├── menu/
│   ├── orders/
│   ├── pos/
│   ├── kitchen/
│   ├── tables/
│   ├── reservations/
│   ├── inventory/
│   ├── staff/
│   ├── payments/
│   └── reports/
├── lib/
│   ├── firebase/
│   ├── auth/
│   ├── security/
│   ├── validation/
│   ├── services/
│   └── utils/
├── hooks/
├── store/
├── config/
├── public/
├── tests/
├── scripts/
├── .env.example
├── firestore.rules
├── firestore.indexes.json
├── package.json
└── README.md
```

Adapt this structure to the existing repository rather than moving files
solely to match the example. Keep feature-specific components, schemas,
and services close to their feature.

------------------------------------------------------------------------

## Getting Started

### Prerequisites

-   Node.js version supported by the installed Next.js release.
-   npm.
-   A Firebase project with Authentication and Cloud Firestore enabled.
-   Firebase Storage if image/file uploads are enabled.
-   Firebase Admin credentials for trusted server-side operations.
-   Git.

### Installation

``` bash
git clone <your-repository-url>
cd restaurant-os
npm install
```

Create a local environment file:

``` bash
cp .env.example .env.local
```

Add the values from your Firebase project and server configuration. Then
start the development server:

``` bash
npm run dev
```

Open `http://localhost:3000`.

> If the repository uses a different package manager or script name,
> follow the existing `package.json` and lockfile. Do not mix npm, pnpm,
> and yarn lockfiles.

------------------------------------------------------------------------

## Environment Variables

Use `.env.example` to document required variable names without
committing real credentials.

Example variable categories (match these names to the actual Firebase
configuration in the codebase):

``` env
# Public Firebase web configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Server-only Firebase Admin configuration
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Public application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional integrations — configure only when implemented
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SENTRY_DSN=
```

Notes:

-   `NEXT_PUBLIC_` values are exposed to the browser. Only use them for
    Firebase web configuration and other intentionally public values.
-   Keep private keys and provider secrets server-only.
-   When storing a multiline Firebase private key in an environment
    variable, follow the exact newline handling expected by the Admin
    SDK initialization code.
-   Never paste production secrets into source code, screenshots, issue
    trackers, or Git commits.
-   Remove unused example variables rather than implying an integration
    is already active.

------------------------------------------------------------------------

## Development Commands

Common Next.js scripts (confirm exact names in `package.json`):

``` bash
npm run dev       # Start local development
npm run build     # Create a production build
npm run start     # Run the production build locally
npm run lint      # Run lint checks
npm run test      # Run unit/component tests, if configured
npm run test:e2e  # Run Playwright tests, if configured
```

Before opening a pull request:

1.  Run lint and relevant tests.
2.  Run a production build.
3.  Test the affected workflow with the correct role.
4.  Check desktop, tablet, and mobile layouts.
5.  Verify loading, empty, error, and permission-denied states.

------------------------------------------------------------------------

## Testing and Quality

Prioritize tests around business-critical workflows.

**Unit tests**

-   Money and tax calculations.
-   Permission checks.
-   Order status transitions.
-   Reservation capacity rules.
-   Inventory movement calculations.
-   Input schemas and validation.

**Integration tests**

-   Authentication and tenant membership.
-   Firestore repository behavior.
-   Order creation and kitchen ticket creation.
-   Payment webhook idempotency.
-   Stock receiving and adjustments.

**End-to-end tests**

-   Owner sign-in and branch selection.
-   Cashier creates a dine-in order.
-   Kitchen receives and completes a ticket.
-   Cashier records payment and closes the order.
-   Manager creates a menu item.
-   Inventory manager receives stock.
-   Unauthorized user is blocked from another tenant's data.

Never use real payment credentials or production customer data in
automated tests.

------------------------------------------------------------------------

## Deployment

### Recommended deployment flow

1.  Create separate development, staging, and production Firebase
    projects where practical.
2.  Configure environment variables in the hosting platform.
3.  Deploy Firestore Security Rules and indexes through a reviewed
    process.
4.  Run the production build.
5.  Deploy the Next.js application to Vercel or the selected hosting
    platform.
6.  Configure the production domain and HTTPS.
7.  Configure and verify payment webhooks only when payment integration
    is implemented.
8.  Test authentication, tenant isolation, critical workflows, and
    monitoring after deployment.

### Production checklist

-   [ ] Production environment variables configured.
-   [ ] No secrets committed to Git.
-   [ ] Firestore rules reviewed and deployed.
-   [ ] Required Firestore indexes deployed.
-   [ ] Tenant and branch authorization tested.
-   [ ] Admin SDK restricted to server code.
-   [ ] App Check configured where appropriate.
-   [ ] Authentication and password recovery tested.
-   [ ] Payment webhooks verified, if enabled.
-   [ ] Backup and recovery process documented.
-   [ ] Error monitoring configured.
-   [ ] Public pages have metadata and optimized images.
-   [ ] Mobile, tablet, POS, and kitchen layouts tested.
-   [ ] Privacy, terms, and data-retention requirements reviewed.

------------------------------------------------------------------------

## Development Roadmap

The roadmap is intentionally phased. Build a dependable core before
adding every advanced SaaS feature.

### Phase 1 --- Foundation

-   [ ] Next.js application shell and design system.
-   [ ] Firebase client and Admin SDK setup.
-   [ ] Authentication and protected routes.
-   [ ] Tenant onboarding and membership model.
-   [ ] Roles, permissions, and branch access.
-   [ ] Firestore rules and indexes.
-   [ ] Error, loading, empty, and not-found states.

### Phase 2 --- Restaurant Website and Menu

-   [ ] Restaurant public website.
-   [ ] Restaurant profile and branding management.
-   [ ] Menu categories and items.
-   [ ] Menu images and storage.
-   [ ] Branch-specific availability.
-   [ ] SEO metadata and sitemap.

### Phase 3 --- Core Operations

-   [ ] POS order creation.
-   [ ] Dine-in, takeaway, and delivery order types.
-   [ ] Table management.
-   [ ] Kitchen Display System.
-   [ ] Order status and activity history.
-   [ ] Receipt generation.

### Phase 4 --- Business Management

-   [ ] Reservations.
-   [ ] Staff and shift management.
-   [ ] Inventory and stock movements.
-   [ ] Suppliers and purchase orders.
-   [ ] Expenses and cash reconciliation.
-   [ ] Operational reports.

### Phase 5 --- Reliability and Integrations

-   [ ] Offline cache and mutation queue.
-   [ ] Conflict handling and sync recovery.
-   [ ] Payment provider integration.
-   [ ] Email/SMS/WhatsApp notifications through approved providers.
-   [ ] Automated tests for critical workflows.
-   [ ] Monitoring, backups, and recovery drills.

### Phase 6 --- SaaS Expansion

-   [ ] Multiple branches per tenant.
-   [ ] Platform admin console.
-   [ ] Tenant approval and lifecycle management.
-   [ ] Subscription plans and feature entitlements.
-   [ ] Usage tracking and billing.
-   [ ] Customer loyalty and marketing tools.
-   [ ] Advanced analytics and exports.

------------------------------------------------------------------------

## Contribution Guidelines

1.  Create a focused branch for each feature or fix.
2.  Keep components reusable, but avoid premature abstraction.
3.  Keep business rules in feature services rather than UI components.
4.  Validate all user input on the server.
5.  Add tests for calculations, permissions, and critical state
    transitions.
6.  Do not commit secrets, customer data, generated build folders, or
    local environment files.
7.  Update this README when architecture, setup, or supported features
    change.
8.  Describe incomplete features honestly; do not mark roadmap items
    complete until they are implemented and verified.

### Suggested branch naming

``` text
feature/pos-order-flow
feature/kitchen-display
feature/inventory-management
fix/tenant-access-check
chore/firebase-rules
```

### Commit message examples

``` text
feat(pos): add dine-in order creation
feat(kitchen): add ticket status workflow
fix(auth): enforce branch membership
test(orders): cover total calculation
docs: update setup instructions
```

------------------------------------------------------------------------

## Product Principles

1.  **Correctness before convenience** for money, orders, permissions,
    and stock.
2.  **Fast workflows** for staff working under pressure.
3.  **Clear ownership** of every tenant's data.
4.  **Traceability** for financial and inventory changes.
5.  **Graceful recovery** when networks or integrations fail.
6.  **Honest product status** --- planned features are not presented as
    completed features.
7.  **Consistent experience** across public website, POS, kitchen, and
    admin.

------------------------------------------------------------------------

## License

Choose and add a license before distributing this project publicly or
commercially. Until a license is added, do not assume that others have
permission to reuse, modify, or redistribute the code.

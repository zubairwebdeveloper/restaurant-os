# Orders and POS (Phase 7)

Pages: `/dashboard/pos` (needs `POS_CREATE`), `/dashboard/orders` (needs `ORDERS_READ`), `/dashboard/settings` (needs `SETTINGS_MANAGE`).

## The money rules
1. **The server prices every order.** The browser sends product ids, variant/option ids, quantities and notes, never prices or totals. The server loads the items from *that restaurant's* menu, validates sizes and required/maximum options, rejects sold-out items, and computes everything. The POS screen shows an estimate using the *same* function (`lib/pos/pricing.js`), but the server's result is final.
2. **Integer arithmetic only.** All amounts are minor units; percentages are basis points (1600 = 16%); rounding is half-up at each step.
3. **Calculation order:** subtotal, minus discount (percent or fixed, capped at the subtotal), plus service charge on the discounted amount, plus tax on (discounted amount + service charge). Prices are tax-exclusive. Tax and service charge default to **0** until the owner sets them in Settings; nothing is assumed.
4. **Orders are snapshots.** Names, options and prices are copied into the order, so later menu or tax changes never alter old orders or receipts.
5. **Idempotency.** Every order, payment request and refund carries a client-generated UUID. A retry or double-tap returns the original result and never creates a second order, payment or refund; reusing a key for something different is refused (`IDEMPOTENCY_CONFLICT`). The browser keeps the same key across failed attempts and creates a new one only when the cart changes.
6. **Immutable ledger.** Each payment and refund is a separate entry in `tenants/{id}/transactions` (never edited or deleted; clients cannot write there). A refund is a new entry. The order keeps a compact copy (`payments[]`, `refunds[]`, `paidMinor`, `refundedMinor`) written in the same transaction, so the order and ledger cannot disagree (tested).
7. **Demo payments only.** Methods are Cash, Card (demo) and Mobile wallet (demo). Card and wallet entries are flagged `demo: true`, no money moves, and receipts say so. A real gateway needs explicit approval and its own phase.

## Order lifecycle
`OPEN` (unpaid or partly paid) → `PAID`; `OPEN` with no payment → `CANCELLED` (reason required); `PAID` → `PARTIALLY_REFUNDED` → `REFUNDED`. Paid orders are refunded, never cancelled. Refunds cannot exceed what was paid. Kitchen progress (`NEW` → `PREPARING` → `READY` → `COMPLETED`, forward only) is stored on the order and is the base for the Kitchen Display (Phase 9).

## Who can do what
| Action | Permission |
|---|---|
| Open POS, place orders, take payments | `POS_CREATE` (cashier, waiter, manager, owner) |
| Apply a discount | `POS_DISCOUNT` (owner, manager); enforced on the server, the controls are hidden for others |
| View orders | `ORDERS_READ` |
| Cancel an unpaid order, advance kitchen status | `ORDERS_UPDATE` (kitchen status also `KITCHEN_UPDATE`) |
| Refund | `ORDERS_REFUND` (owner, manager) |
| Currency, tax, service charge, receipt details | `SETTINGS_MANAGE` |

## Order types
Dine in (table label), Takeaway, Delivery (customer name, phone, address). The table is a plain label for now; linking to the table plan comes with Phase 8. There are no customer records yet (Phase 13).

## Split bills
A payment can be several lines (for example cash plus card), paid in one request or across several requests until the balance is zero. "Split equally between N" divides the balance so the parts add up exactly. Item-level splitting is not built.

## Receipts
Printable (browser print) from the payment screen and from an order's detail. Shows the sale snapshot, discount, service charge, tax, payments, change, refunds, optional tax registration number and footer.

## Settings
`tenants/{id}.settings`: `currency`, `taxBp`, `serviceBp`, `taxLabel`, `taxRegistration`, `receiptFooter`. Saved only by a validated Server Action; clients can no longer write the tenant document. Corrupt values fall back to safe defaults (no tax).

## Permissions migration (important)
Phase 7 adds the permissions `POS_DISCOUNT` and `ORDERS_REFUND`. Existing memberships keep the permission list they were created with, so **existing owners and managers will not have them until you run**
`npm run sync:permissions` (dry run, prints the changes) and then `npm run sync:permissions -- --apply`. It needs Admin credentials (or the emulators) and Node 22.7+.

## Known limits
- Not tested against real Firebase or the emulators; not used in a real browser. Order logic runs against an in-memory stand-in; the client flow is tested in jsdom with mocked Server Actions.
- Order numbers are sequential per restaurant (no daily reset). Orders are loaded as the latest 200, no live updates (use refresh).
- The POS loads the whole menu (up to 500 products) on every open; offline use and local caching come with Phase 10, so the POS needs a connection.
- Tax-inclusive pricing, per-item tax rates and tip handling are not supported.
- Printing uses the browser's print dialog; there is no thermal-printer or cash-drawer integration.
- If a response is lost after an order was saved and the cashier then edits the cart, a second order can be created (a deliberate, different cart gets a new key).
- Two cashiers refunding the same order at once are serialised; the later one is refused if nothing is left.

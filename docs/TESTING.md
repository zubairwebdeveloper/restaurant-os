# Testing

| Command | What it runs | Needs |
|---|---|---|
| `npm test` | Unit tests (`tests/unit`) | Node 22+ |
| `npm run test:rules` | Firestore + Storage rules tests (`tests/security`) in the emulator | Java 21+, Node **24.12+** (required by `@firebase/rules-unit-testing` 6), network to download emulator jars |
| `npm run emulators` | Start Auth, Firestore, Storage emulators | Java 21+ |

If your Node is older than 24.12, upgrade it for rules tests or pin `@firebase/rules-unit-testing@5` with `firebase@12`.
Rules tests use fixtures in `tests/fixtures/tenants.js` and the demo project id `demo-restaurant-os` (never touches real data).

## Status at the end of Phase 7
- Unit tests: 247 passing, including 500 randomized money-invariant orders, idempotency and concurrency (double-tap, two cashiers, racing refunds), ledger/order consistency, and a jsdom test of the full POS flow (add item, options, checkout, place, pay, split, receipt, retry with the same idempotency key) with mocked Server Actions.
- Mutation check: deliberately breaking the payment idempotency key, the duplicate-payment guard, and the discount cap each made tests fail, then everything passed again when restored.
- Runtime smoke test (production build): POS, Orders and Settings redirect when signed out and render nothing for a forged cookie.
- Not tested: anything against real Firebase or the emulators (including the rules tests), a real browser (touch targets, printing, drag, focus), and mobile layouts.
- The jsdom tests need Node ^22.22.2 or 24.15+ (jsdom's requirement).

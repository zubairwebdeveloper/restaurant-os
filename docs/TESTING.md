# Testing

| Command | What it runs | Needs |
|---|---|---|
| `npm test` | Unit tests (`tests/unit`) | Node 22+ |
| `npm run test:rules` | Firestore + Storage rules tests (`tests/security`) in the emulator | Java 21+, Node **24.12+** (required by `@firebase/rules-unit-testing` 6), network to download emulator jars |
| `npm run emulators` | Start Auth, Firestore, Storage emulators | Java 21+ |

If your Node is older than 24.12, upgrade it for rules tests or pin `@firebase/rules-unit-testing@5` with `firebase@12`.
Rules tests use fixtures in `tests/fixtures/tenants.js` and the demo project id `demo-restaurant-os` (never touches real data).

## Status at the end of Phase 3
- Unit tests: 58 passing.
- Runtime smoke test (production build): route guards, CSRF checks and cookie clearing verified with curl.
- Sign-in/registration flows: not tested against Firebase.
- Rules tests: written, never executed (the build sandbox could not download the emulator).

# Restaurant OS

Multi-tenant restaurant SaaS platform (Next.js App Router, JavaScript/JSX only, Tailwind CSS, Redux Toolkit).

## Status
**Phase 3 - Authentication and role-based access.** Login, registration, email verification, password reset, server sessions and route guards are implemented; they have NOT been tested against a live Firebase project or the emulators, and the Firebase rules tests have not been run (see docs/AUTHENTICATION.md and docs/TENANT_ISOLATION.md).
Firestore and Storage rules live in `firebase/`. No sign-in or tenant onboarding yet (Phase 3 and 5).

## Getting started
```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests (Vitest)
npm run lint
npm run build
```
Review the interface foundation at `/dashboard/design-system` (toggle light/dark in the header).

## Rules of the project
JavaScript/JSX only. Redux Toolkit is the single global state library (no Zustand).
Redux is never an authorization boundary. Never commit secrets; see `.env.example`.
Docs live in `docs/`.

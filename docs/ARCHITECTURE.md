# Architecture (Phase 1)

## Stack in this phase
Next.js 16 (App Router, Cache Components enabled by the starter), React 19, Tailwind CSS v4,
Radix primitives (hand-written shadcn-style components in `components/ui`), Redux Toolkit 2, Sonner, Lucide, Vitest.

## State (Redux Toolkit)
- `store/index.js` exports `makeStore()`. `ReduxProvider` creates one store per provider mount (never a module-level singleton).
- Slices: `themeSlice`, `sidebarSlice`, `uiSlice`. Other slices are placeholders for later phases.
- `rootReducer.resetTenantScopedState` clears all slices except device preferences (theme, sidebar). Dispatch it on logout, membership loss and tenant switch.
- Side effects use the listener middleware, registered from a client effect (`registerAppListeners`), not during render.
- DevTools are enabled outside production only. Keep Firebase SDK objects and Timestamps out of state.

## Design tokens
Defined in `app/globals.css` as CSS variables (light + `.dark`), mapped to Tailwind via `@theme inline`.
Components use semantic tokens only. Tenant branding overrides `--primary`, `--primary-foreground`, `--ring`
on a scoped wrapper using `buildBrandStyle()` in `lib/utils/color.js`, which rejects colours below WCAG AA contrast (4.5:1).

## Fonts
Tokens reference Manrope (display) and Inter (body) with system fallbacks. Add them with `next/font/google`
when ready (the sandbox used for this build had no access to Google Fonts).

## Navigation
`config/navigation.js` lists items per phase; the sidebar renders only items whose phase has shipped.

## Known limits (Phase 1)
- No browser, keyboard, touch or mobile-viewport testing has been done yet.
- No Lighthouse or accessibility audit has been run.
- Command palette, restaurant/branch switcher and notifications are not built yet.

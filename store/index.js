import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./rootReducer";
import { buildMiddleware } from "./middleware";
import { createAppListenerMiddleware } from "./listenerMiddleware";

/**
 * Store factory. Next.js App Router must not share a module-level store between
 * requests, so ReduxProvider creates one store per mounted provider.
 * Redux is NOT a security boundary: all authorization happens on the server
 * and in Firebase Security Rules.
 */
export function makeStore(preloadedState) {
  const listener = createAppListenerMiddleware();
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: buildMiddleware(listener),
    // DevTools only outside production, to avoid exposing business state.
    devTools: process.env.NODE_ENV !== "production",
  });
}

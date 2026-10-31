import { addListener, createListenerMiddleware } from "@reduxjs/toolkit";
import { setThemeMode, setResolvedTheme } from "./slices/themeSlice";
import { THEME_STORAGE_KEY, applyTheme } from "@/lib/utils/theme";

/** One instance per store (the store is created per provider mount). */
export function createAppListenerMiddleware() {
  return createListenerMiddleware();
}

// Persist the theme preference and apply it to <html>.
const themeListener = {
  actionCreator: setThemeMode,
  effect: (action, api) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, action.payload);
    } catch {
      /* storage unavailable (private mode) - preference simply won't persist */
    }
    api.dispatch(setResolvedTheme(applyTheme(action.payload)));
  },
};

/**
 * Registers side-effect listeners. Call from a client effect (never during render):
 * listener ids are random, which must not be evaluated while prerendering.
 * Returns an unsubscribe function for cleanup.
 */
export function registerAppListeners(store) {
  const unsubscribers = [store.dispatch(addListener(themeListener))];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

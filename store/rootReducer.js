import { combineReducers, createAction } from "@reduxjs/toolkit";
import theme from "./slices/themeSlice";
import sidebar from "./slices/sidebarSlice";
import ui from "./slices/uiSlice";
import auth from "./slices/authSlice";
import tenant from "./slices/tenantSlice";
import cart from "./slices/cartSlice";
import pos from "./slices/posSlice";

const appReducer = combineReducers({ theme, sidebar, ui, auth, tenant, cart, pos });

/**
 * Dispatch when the user SWITCHES restaurant or loses a membership.
 * Clears every slice except device preferences (theme, sidebar) and the signed-in user (auth),
 * so nothing from the previous tenant can appear for the next one.
 * Tenant-scoped slices added in later phases are cleared automatically.
 */
export const resetTenantScopedState = createAction("app/resetTenantScopedState");

/** Dispatch on LOGOUT. Clears everything except device preferences (theme, sidebar). */
export const resetAllSessionState = createAction("app/resetAllSessionState");

const KEEP_ON_TENANT_RESET = ["theme", "sidebar", "auth"];
const KEEP_ON_LOGOUT = ["theme", "sidebar"];

function keepOnly(state, keys) {
  const kept = {};
  for (const key of keys) kept[key] = state[key];
  return kept;
}

export default function rootReducer(state, action) {
  if (state && resetTenantScopedState.match(action)) return appReducer(keepOnly(state, KEEP_ON_TENANT_RESET), action);
  if (state && resetAllSessionState.match(action)) return appReducer(keepOnly(state, KEEP_ON_LOGOUT), action);
  return appReducer(state, action);
}

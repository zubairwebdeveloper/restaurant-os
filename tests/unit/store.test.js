import { describe, it, expect } from "vitest";
import { makeStore } from "@/store";
import { resetAllSessionState, resetTenantScopedState } from "@/store/rootReducer";
import { setSession, clearSession, selectUser, selectAuthStatus } from "@/store/slices/authSlice";
import { setTenants, selectActiveMembership, selectHasPermission, selectMemberships } from "@/store/slices/tenantSlice";
import { hydrateTheme, setThemeMode, selectThemeMode } from "@/store/slices/themeSlice";
import { toggleCollapsed, openMobile, closeMobile, selectSidebarCollapsed, selectSidebarMobileOpen } from "@/store/slices/sidebarSlice";
import { openModal, closeModal, selectActiveModal } from "@/store/slices/uiSlice";

describe("store", () => {
  it("creates an independent store per call", () => {
    const a = makeStore();
    const b = makeStore();
    a.dispatch(toggleCollapsed());
    expect(selectSidebarCollapsed(a.getState())).toBe(true);
    expect(selectSidebarCollapsed(b.getState())).toBe(false);
  });

  it("theme slice validates modes", () => {
    const s = makeStore();
    s.dispatch(setThemeMode("dark"));
    expect(selectThemeMode(s.getState())).toBe("dark");
    s.dispatch(setThemeMode("neon"));
    expect(selectThemeMode(s.getState())).toBe("dark");
    s.dispatch(hydrateTheme({ mode: "bogus", resolved: "dark" }));
    expect(s.getState().theme).toEqual({ mode: "system", resolved: "dark", hydrated: true });
  });

  it("sidebar slice handles the mobile drawer", () => {
    const s = makeStore();
    s.dispatch(openMobile());
    expect(selectSidebarMobileOpen(s.getState())).toBe(true);
    s.dispatch(closeMobile());
    expect(selectSidebarMobileOpen(s.getState())).toBe(false);
  });

  it("reset clears session UI but keeps device preferences", () => {
    const s = makeStore();
    s.dispatch(setThemeMode("dark"));
    s.dispatch(toggleCollapsed());
    s.dispatch(openModal("confirm-suspend"));
    expect(selectActiveModal(s.getState())).toBe("confirm-suspend");
    s.dispatch(resetTenantScopedState());
    expect(selectActiveModal(s.getState())).toBeNull();
    expect(selectThemeMode(s.getState())).toBe("dark");
    expect(selectSidebarCollapsed(s.getState())).toBe(true);
    s.dispatch(openModal("x"));
    s.dispatch(closeModal());
    expect(selectActiveModal(s.getState())).toBeNull();
  });

  it("keeps state serializable (no non-plain values)", () => {
    const s = makeStore();
    s.dispatch(openModal("a"));
    expect(() => JSON.stringify(s.getState())).not.toThrow();
  });
});

describe("listeners", () => {
  it("registers and unregisters without breaking the store", async () => {
    const { registerAppListeners } = await import("@/store/listenerMiddleware");
    const s = makeStore();
    const off = registerAppListeners(s);
    expect(typeof off).toBe("function");
    s.dispatch(openModal("z"));
    expect(selectActiveModal(s.getState())).toBe("z");
    expect(() => off()).not.toThrow();
  });
});

describe("auth and tenant slices", () => {
  const session = { user: { uid: "u1", email: "a@b.co", emailVerified: true, name: "Ayesha", extra: "dropped" }, platformRole: null };
  const tenants = {
    memberships: [
      { tenantId: "T1", tenantName: "Green Lagoon", role: "CASHIER", permissions: ["POS_READ", "POS_CREATE"] },
      { tenantId: "T2", tenantName: "City Cafe", role: "OWNER", permissions: ["SETTINGS_MANAGE"] },
    ],
    activeTenantId: "T1",
  };

  it("stores only the expected user fields", () => {
    const s = makeStore();
    s.dispatch(setSession(session));
    expect(selectAuthStatus(s.getState())).toBe("authenticated");
    expect(selectUser(s.getState())).toEqual({ uid: "u1", email: "a@b.co", emailVerified: true, name: "Ayesha" });
  });

  it("derives active membership and permission hints", () => {
    const s = makeStore();
    s.dispatch(setTenants(tenants));
    expect(selectActiveMembership(s.getState()).tenantName).toBe("Green Lagoon");
    expect(selectHasPermission("POS_CREATE")(s.getState())).toBe(true);
    expect(selectHasPermission("SETTINGS_MANAGE")(s.getState())).toBe(false);
  });

  it("tenant switch clears tenant state but keeps the signed-in user and preferences", () => {
    const s = makeStore();
    s.dispatch(setSession(session));
    s.dispatch(setTenants(tenants));
    s.dispatch(setThemeMode("dark"));
    s.dispatch(resetTenantScopedState());
    expect(selectMemberships(s.getState())).toEqual([]);
    expect(selectAuthStatus(s.getState())).toBe("authenticated");
    expect(selectThemeMode(s.getState())).toBe("dark");
  });

  it("logout clears user and tenants but keeps device preferences", () => {
    const s = makeStore();
    s.dispatch(setSession(session));
    s.dispatch(setTenants(tenants));
    s.dispatch(setThemeMode("dark"));
    s.dispatch(resetAllSessionState());
    expect(selectUser(s.getState())).toBeNull();
    expect(selectMemberships(s.getState())).toEqual([]);
    expect(selectAuthStatus(s.getState())).toBe("unknown");
    expect(selectThemeMode(s.getState())).toBe("dark");
    s.dispatch(clearSession());
    expect(selectAuthStatus(s.getState())).toBe("unauthenticated");
  });
});

import { addLine, beginSubmission, clearCart, removeLine, selectCartCount, setDiscount, setQuantity, setOrderType, setTableLabel } from "@/store/slices/cartSlice";
import { closePayment, openPayment, selectCategory, selectPaymentTarget } from "@/store/slices/posSlice";

describe("cart and pos slices", () => {
  const karahi = { productId: "ProdKarahiAAAAAAAAAA", name: "Chicken Karahi", unitPriceMinor: 125000 };

  it("merges identical lines and keeps different options apart", () => {
    const s = makeStore();
    s.dispatch(addLine({ ...karahi }));
    s.dispatch(addLine({ ...karahi, quantity: 2 }));
    expect(s.getState().cart.lines).toHaveLength(1);
    expect(selectCartCount(s.getState())).toBe(3);
    s.dispatch(addLine({ ...karahi, note: "no chili" }));
    s.dispatch(addLine({ ...karahi, variantId: "variant-large", selections: [{ groupId: "g1", optionIds: ["b", "a"] }] }));
    s.dispatch(addLine({ ...karahi, variantId: "variant-large", selections: [{ groupId: "g1", optionIds: ["a", "b"] }] })); // same options, different order
    expect(s.getState().cart.lines).toHaveLength(3);
  });

  it("caps quantities, removes at zero, and never stores totals", () => {
    const s = makeStore();
    s.dispatch(addLine({ ...karahi, quantity: 98 }));
    s.dispatch(addLine({ ...karahi, quantity: 50 }));
    expect(s.getState().cart.lines[0].quantity).toBe(99);
    const id = s.getState().cart.lines[0].lineId;
    s.dispatch(setQuantity({ lineId: id, quantity: 0 }));
    expect(s.getState().cart.lines).toHaveLength(0);
    expect(JSON.stringify(s.getState().cart)).not.toMatch(/total/i);
  });

  it("resets the idempotency key whenever the cart changes, and reuses it for retries", () => {
    const s = makeStore();
    s.dispatch(addLine({ ...karahi }));
    s.dispatch(beginSubmission());
    const key = s.getState().cart.clientOrderId;
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    s.dispatch(beginSubmission()); // retry of the same cart
    expect(s.getState().cart.clientOrderId).toBe(key);
    s.dispatch(setTableLabel("T5"));
    expect(s.getState().cart.clientOrderId).toBeNull();
    s.dispatch(beginSubmission());
    s.dispatch(setDiscount({ type: "PERCENT", value: "10" }));
    s.dispatch(setOrderType("DELIVERY"));
    s.dispatch(removeLine(s.getState().cart.lines[0].lineId));
    expect(s.getState().cart.clientOrderId).toBeNull();
  });

  it("tenant switch and logout clear the cart and payment dialog", () => {
    const s = makeStore();
    s.dispatch(addLine({ ...karahi }));
    s.dispatch(selectCategory("c1"));
    s.dispatch(openPayment({ orderId: "o", orderNumber: 7, totalMinor: 100 }));
    expect(selectPaymentTarget(s.getState())).toMatchObject({ orderNumber: 7, paidMinor: 0 });
    s.dispatch(resetTenantScopedState());
    expect(s.getState().cart.lines).toEqual([]);
    expect(s.getState().pos.selectedCategoryId).toBe("all");
    expect(selectPaymentTarget(s.getState())).toBeNull();
    s.dispatch(addLine({ ...karahi }));
    s.dispatch(resetAllSessionState());
    expect(s.getState().cart.lines).toEqual([]);
    s.dispatch(addLine({ ...karahi }));
    s.dispatch(clearCart());
    s.dispatch(closePayment());
    expect(selectCartCount(s.getState())).toBe(0);
  });
});

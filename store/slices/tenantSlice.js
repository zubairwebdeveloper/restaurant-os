import { createSlice } from "@reduxjs/toolkit";

/**
 * The user's verified workspaces, copied from the server session for display and for
 * hiding UI the user cannot use. Hiding a button is a convenience, not security:
 * every action is re-authorized on the server and in Firebase rules.
 */
const initialState = {
  memberships: [], // [{ tenantId, tenantName, role, permissions[] }]
  activeTenantId: null,
};

const tenantSlice = createSlice({
  name: "tenant",
  initialState,
  reducers: {
    setTenants(state, action) {
      const { memberships, activeTenantId } = action.payload;
      state.memberships = memberships.map((m) => ({
        tenantId: m.tenantId,
        tenantName: m.tenantName,
        role: m.role,
        permissions: [...m.permissions],
      }));
      state.activeTenantId = activeTenantId ?? null;
    },
    clearTenants() {
      return initialState;
    },
  },
});

export const { setTenants, clearTenants } = tenantSlice.actions;
export const selectMemberships = (state) => state.tenant.memberships;
export const selectActiveTenantId = (state) => state.tenant.activeTenantId;
export const selectActiveMembership = (state) =>
  state.tenant.memberships.find((m) => m.tenantId === state.tenant.activeTenantId) ?? null;
export const selectHasPermission = (permission) => (state) =>
  selectActiveMembership(state)?.permissions.includes(permission) ?? false;
export default tenantSlice.reducer;

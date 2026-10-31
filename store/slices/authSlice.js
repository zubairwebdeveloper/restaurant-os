import { createSlice } from "@reduxjs/toolkit";

/**
 * Display-only copy of the signed-in user, hydrated from the server session.
 * NOT an authorization mechanism: the server and Firebase rules decide access.
 */
const initialState = {
  status: "unknown", // "unknown" | "authenticated" | "unauthenticated"
  user: null, // { uid, email, emailVerified, name } (plain values only)
  platformRole: null, // "SUPER_ADMIN" | "PLATFORM_SUPPORT" | null (UI hint only)
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(state, action) {
      const { user, platformRole } = action.payload;
      state.status = "authenticated";
      state.user = {
        uid: user.uid,
        email: user.email ?? null,
        emailVerified: Boolean(user.emailVerified),
        name: user.name ?? null,
      };
      state.platformRole = platformRole ?? null;
    },
    clearSession(state) {
      state.status = "unauthenticated";
      state.user = null;
      state.platformRole = null;
    },
  },
});

export const { setSession, clearSession } = authSlice.actions;
export const selectAuthStatus = (state) => state.auth.status;
export const selectUser = (state) => state.auth.user;
export const selectPlatformRole = (state) => state.auth.platformRole;
export default authSlice.reducer;

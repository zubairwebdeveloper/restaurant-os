import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  collapsed: false, // desktop: icon-only rail
  mobileOpen: false, // mobile: drawer visibility
};

const sidebarSlice = createSlice({
  name: "sidebar",
  initialState,
  reducers: {
    toggleCollapsed(state) {
      state.collapsed = !state.collapsed;
    },
    setCollapsed(state, action) {
      state.collapsed = Boolean(action.payload);
    },
    openMobile(state) {
      state.mobileOpen = true;
    },
    closeMobile(state) {
      state.mobileOpen = false;
    },
  },
});

export const { toggleCollapsed, setCollapsed, openMobile, closeMobile } = sidebarSlice.actions;
export const selectSidebarCollapsed = (state) => state.sidebar.collapsed;
export const selectSidebarMobileOpen = (state) => state.sidebar.mobileOpen;
export default sidebarSlice.reducer;

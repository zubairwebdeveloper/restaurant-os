import { createSlice } from "@reduxjs/toolkit";
import { isThemeMode } from "@/lib/utils/theme";

const initialState = {
  mode: "system", // user preference: "system" | "light" | "dark"
  resolved: "light", // actual theme applied to the page
  hydrated: false, // true once the stored preference has been read on the client
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    hydrateTheme(state, action) {
      const { mode, resolved } = action.payload;
      state.mode = isThemeMode(mode) ? mode : "system";
      state.resolved = resolved === "dark" ? "dark" : "light";
      state.hydrated = true;
    },
    setThemeMode(state, action) {
      if (isThemeMode(action.payload)) state.mode = action.payload;
    },
    setResolvedTheme(state, action) {
      state.resolved = action.payload === "dark" ? "dark" : "light";
    },
  },
});

export const { hydrateTheme, setThemeMode, setResolvedTheme } = themeSlice.actions;
export const selectThemeMode = (state) => state.theme.mode;
export const selectResolvedTheme = (state) => state.theme.resolved;
export const selectThemeHydrated = (state) => state.theme.hydrated;
export default themeSlice.reducer;

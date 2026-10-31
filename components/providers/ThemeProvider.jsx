"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateTheme, selectThemeMode, setResolvedTheme } from "@/store/slices/themeSlice";
import { THEME_STORAGE_KEY, applyTheme, isThemeMode } from "@/lib/utils/theme";

/** Reads the stored preference once, then keeps "system" mode in sync with the OS. */
export default function ThemeProvider({ children }) {
  const dispatch = useAppDispatch();
  const mode = useAppSelector(selectThemeMode);

  useEffect(() => {
    let stored = "system";
    try {
      const value = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemeMode(value)) stored = value;
    } catch {
      /* ignore */
    }
    dispatch(hydrateTheme({ mode: stored, resolved: applyTheme(stored) }));
  }, [dispatch]);

  useEffect(() => {
    if (mode !== "system") return undefined;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => dispatch(setResolvedTheme(applyTheme("system")));
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [mode, dispatch]);

  return children;
}

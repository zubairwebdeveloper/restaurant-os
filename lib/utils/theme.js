export const THEME_STORAGE_KEY = "ros-theme";
export const THEME_MODES = ["system", "light", "dark"];

export function isThemeMode(value) {
  return THEME_MODES.includes(value);
}

/** Browser only. Resolves "system" via prefers-color-scheme. */
export function resolveTheme(mode) {
  if (mode === "light" || mode === "dark") return mode;
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Browser only. Updates <html> class + color-scheme. Returns the resolved theme. */
export function applyTheme(mode) {
  const resolved = resolveTheme(mode);
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }
  return resolved;
}

/** Runs before first paint (inline in <head>) to avoid a light/dark flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem("${THEME_STORAGE_KEY}");var d=m==="dark"||((m!=="light")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

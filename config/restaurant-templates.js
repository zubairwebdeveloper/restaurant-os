/**
 * Public website templates and font pairings. Templates are data: the same
 * <PublicSite> component renders any of them, so new restaurants need no code changes.
 * Colours are tokens scoped to the public site wrapper (they never touch the app theme).
 * tests/unit/website.test.js checks every template meets WCAG AA contrast.
 */
export const FONT_PAIRINGS = Object.freeze({
  modern: { label: "Modern sans", display: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', body: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' },
  editorial: { label: "Editorial serif", display: '"Iowan Old Style", "Palatino Linotype", Georgia, serif', body: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' },
  friendly: { label: "Friendly rounded", display: 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif', body: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' },
  bold: { label: "Bold impact", display: '"Arial Narrow", "Helvetica Neue", Impact, ui-sans-serif, sans-serif', body: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' },
});

export const TEMPLATES = Object.freeze({
  "premium-restaurant": {
    id: "premium-restaurant", name: "Premium Restaurant", description: "Warm ivory, refined serif headings, generous space.",
    hero: "split", fontPairing: "editorial", defaultPrimary: "#1C2330", uppercaseHeadings: false,
    vars: { "--background": "#F6F3EC", "--foreground": "#1A1D23", "--surface": "#FFFFFF", "--muted": "#ECE8DE", "--muted-foreground": "#5F5E58", "--border": "#DDD7C9" },
  },
  "modern-cafe": {
    id: "modern-cafe", name: "Modern Cafe", description: "Light, friendly and minimal with coffee tones.",
    hero: "centered", fontPairing: "friendly", defaultPrimary: "#7A4B2A", uppercaseHeadings: false,
    vars: { "--background": "#FBF7F1", "--foreground": "#2B2118", "--surface": "#FFFFFF", "--muted": "#F1E8DB", "--muted-foreground": "#6B5B4D", "--border": "#E8DCCB" },
  },
  "fast-food": {
    id: "fast-food", name: "Fast Food", description: "High contrast, bold type and strong calls to action.",
    hero: "bold", fontPairing: "bold", defaultPrimary: "#C62828", uppercaseHeadings: true,
    vars: { "--background": "#FFFFFF", "--foreground": "#111111", "--surface": "#FFF4E0", "--muted": "#F3F3F3", "--muted-foreground": "#555555", "--border": "#111111" },
  },
  "fine-dining": {
    id: "fine-dining", name: "Fine Dining", description: "Dark, editorial and reservation-focused.",
    hero: "centered", fontPairing: "editorial", defaultPrimary: "#D6B67A", uppercaseHeadings: false,
    vars: { "--background": "#0E0E10", "--foreground": "#F1ECE2", "--surface": "#17171A", "--muted": "#1F1F23", "--muted-foreground": "#B3ADA0", "--border": "#2C2C31" },
  },
  "hotel-restaurant": {
    id: "hotel-restaurant", name: "Hotel Restaurant", description: "Calm emerald accents for hospitality brands.",
    hero: "split", fontPairing: "editorial", defaultPrimary: "#1F4D3A", uppercaseHeadings: false,
    vars: { "--background": "#F4F1EA", "--foreground": "#16241E", "--surface": "#FFFFFF", "--muted": "#E8E5DC", "--muted-foreground": "#4F5F57", "--border": "#D5D9D0" },
  },
});

export const TEMPLATE_IDS = Object.freeze(Object.keys(TEMPLATES));
export const DEFAULT_TEMPLATE_ID = "premium-restaurant";
export const getTemplate = (id) => TEMPLATES[id] ?? TEMPLATES[DEFAULT_TEMPLATE_ID];

export const DAYS = Object.freeze(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
export const defaultHours = () => DAYS.map((day) => ({ day, closed: false, open: "09:00", close: "22:00" }));

/** Slugs that would collide with app routes or look official. */
export const RESERVED_SLUGS = Object.freeze([
  "admin", "api", "app", "auth", "dashboard", "login", "register", "platform", "r", "www", "support",
  "help", "static", "assets", "settings", "billing", "pricing", "features", "about", "contact", "verify-email",
  "forgot-password", "reset-password", "invite", "health", "restaurant-os", "restaurantos",
]);

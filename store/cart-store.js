import { create } from "zustand";

/**
 * Phase 2: UI-only basket so the ordering interface works.
 * Persistence, server-side price validation and checkout arrive in Phase 4/6.
 */
export const useCartStore = create((set) => ({
  lines: [], // { id, name, price, qty }
  add: (item) =>
    set((s) => {
      const existing = s.lines.find((l) => l.id === item.id);
      if (existing) {
        return { lines: s.lines.map((l) => (l.id === item.id ? { ...l, qty: l.qty + 1 } : l)) };
      }
      return { lines: [...s.lines, { id: item.id, name: item.name, price: item.price, qty: 1 }] };
    }),
  setQty: (id, qty) =>
    set((s) => ({
      lines: qty <= 0 ? s.lines.filter((l) => l.id !== id) : s.lines.map((l) => (l.id === id ? { ...l, qty } : l)),
    })),
  remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
  clear: () => set({ lines: [] }),
}));

export const selectCartCount = (s) => s.lines.reduce((n, l) => n + l.qty, 0);
export const selectCartTotal = (s) => s.lines.reduce((n, l) => n + l.qty * l.price, 0);

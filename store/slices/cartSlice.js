import { createSlice } from "@reduxjs/toolkit";
import { POS_LIMITS } from "@/config/pos";

/**
 * The POS cart (client state only). It holds what the cashier chose: product and option ids,
 * quantities and notes. Display prices stored on lines are ESTIMATES for the screen; the server
 * ignores them and prices every order from the database. The cart is tenant-scoped, so it is
 * cleared by resetTenantScopedState / resetAllSessionState.
 */
const emptyCustomer = { name: "", phone: "", address: "" };

const initialState = {
  lines: [], // { lineId, productId, name, variantId, variantName, selections:[{groupId, optionIds}], labels:[string], quantity, note, unitPriceMinor }
  orderType: "TAKEAWAY",
  tableLabel: "",
  customer: emptyCustomer,
  discount: { type: "NONE", value: "", reason: "" }, // value is the text the cashier typed
  note: "",
  clientOrderId: null, // idempotency key for the submission; reset whenever the cart changes
};

const sameSelections = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const canonical = (selections) => [...selections].map((s) => ({ groupId: s.groupId, optionIds: [...s.optionIds].sort() })).sort((x, y) => x.groupId.localeCompare(y.groupId));

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addLine: {
      reducer(state, action) {
        const line = action.payload;
        const selections = canonical(line.selections);
        const match = state.lines.find((l) => l.productId === line.productId && l.variantId === line.variantId && l.note === line.note && sameSelections(canonical(l.selections), selections));
        if (match) match.quantity = Math.min(POS_LIMITS.MAX_QUANTITY, match.quantity + line.quantity);
        else state.lines.push({ ...line, selections });
        state.clientOrderId = null;
      },
      // Ids are generated in `prepare` so the reducer stays pure.
      prepare(line) {
        return { payload: { variantId: null, variantName: null, selections: [], labels: [], note: "", quantity: 1, ...line, lineId: globalThis.crypto.randomUUID() } };
      },
    },
    setQuantity(state, action) {
      const { lineId, quantity } = action.payload;
      if (quantity <= 0) state.lines = state.lines.filter((l) => l.lineId !== lineId);
      else {
        const line = state.lines.find((l) => l.lineId === lineId);
        if (line) line.quantity = Math.min(POS_LIMITS.MAX_QUANTITY, Math.floor(quantity));
      }
      state.clientOrderId = null;
    },
    removeLine(state, action) {
      state.lines = state.lines.filter((l) => l.lineId !== action.payload);
      state.clientOrderId = null;
    },
    setOrderType(state, action) {
      state.orderType = action.payload;
      state.clientOrderId = null;
    },
    setTableLabel(state, action) {
      state.tableLabel = action.payload;
      state.clientOrderId = null;
    },
    setCustomer(state, action) {
      state.customer = { ...state.customer, ...action.payload };
      state.clientOrderId = null;
    },
    setDiscount(state, action) {
      state.discount = { ...state.discount, ...action.payload };
      state.clientOrderId = null;
    },
    setNote(state, action) {
      state.note = action.payload;
      state.clientOrderId = null;
    },
    /** Called when the cashier starts placing the order; the same key is reused on retry until the cart changes. */
    beginSubmission: {
      reducer(state, action) {
        if (!state.clientOrderId) state.clientOrderId = action.payload;
      },
      prepare: () => ({ payload: globalThis.crypto.randomUUID() }),
    },
    clearCart: () => initialState,
  },
});

export const { addLine, setQuantity, removeLine, setOrderType, setTableLabel, setCustomer, setDiscount, setNote, beginSubmission, clearCart } = cartSlice.actions;
export const selectCart = (state) => state.cart;
export const selectCartLines = (state) => state.cart.lines;
export const selectCartCount = (state) => state.cart.lines.reduce((n, l) => n + l.quantity, 0);
export default cartSlice.reducer;

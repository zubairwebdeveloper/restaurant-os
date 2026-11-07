import { createSlice } from "@reduxjs/toolkit";

/** POS screen UI state. Tenant-scoped, so it is cleared on tenant switch and logout. */
const initialState = {
  selectedCategoryId: "all",
  search: "",
  // Order awaiting payment in the payment dialog: { orderId, orderNumber, totalMinor, paidMinor }
  paymentTarget: null,
};

const posSlice = createSlice({
  name: "pos",
  initialState,
  reducers: {
    selectCategory(state, action) {
      state.selectedCategoryId = action.payload;
    },
    setSearch(state, action) {
      state.search = action.payload;
    },
    openPayment(state, action) {
      const { orderId, orderNumber, totalMinor, paidMinor = 0 } = action.payload;
      state.paymentTarget = { orderId, orderNumber, totalMinor, paidMinor };
    },
    closePayment(state) {
      state.paymentTarget = null;
    },
  },
});

export const { selectCategory, setSearch, openPayment, closePayment } = posSlice.actions;
export const selectPosCategory = (state) => state.pos.selectedCategoryId;
export const selectPosSearch = (state) => state.pos.search;
export const selectPaymentTarget = (state) => state.pos.paymentTarget;
export default posSlice.reducer;

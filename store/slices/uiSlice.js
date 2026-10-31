import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  activeModal: null, // string id of the globally controlled modal, if any
  commandPaletteOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openModal(state, action) {
      state.activeModal = String(action.payload);
    },
    closeModal(state) {
      state.activeModal = null;
    },
    setCommandPaletteOpen(state, action) {
      state.commandPaletteOpen = Boolean(action.payload);
    },
  },
});

export const { openModal, closeModal, setCommandPaletteOpen } = uiSlice.actions;
export const selectActiveModal = (state) => state.ui.activeModal;
export const selectCommandPaletteOpen = (state) => state.ui.commandPaletteOpen;
export default uiSlice.reducer;

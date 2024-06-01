import { createSlice } from "@reduxjs/toolkit";
import { hideMessage, showMessage } from "../actions";
import { MessageState } from "./state";

const initialState: MessageState = {
  nextId: 1,
  queue: [],
  message: null,
}

const messageSlice = createSlice({
  name: 'message',
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(showMessage.fulfilled, (state, action) => {
        state.nextId += 1
        state.queue = [
          ...state.queue,
          action.payload,
        ]
        state.message = state.queue[0].message
      })
      .addCase(hideMessage, (state, action) => {
        const idx = state.queue.findIndex(e => e.id === action.payload)
        if (idx >= 0) {
          state.queue.splice(idx, 1)
          if (state.queue.length === 0) {
            state.message = null
          } else {
            state.message = state.queue[0].message
          }
        }
      })
  }
})

export default messageSlice.reducer
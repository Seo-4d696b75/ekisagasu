import {configureStore} from "@reduxjs/toolkit"
import mapStateReducer from "./mapStateSlice"

export const store = configureStore({
  reducer: {
    mapState: mapStateReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
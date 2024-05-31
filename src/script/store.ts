import { configureStore } from "@reduxjs/toolkit"
import mapStateReducer from "./mapStateSlice"
import stationStateReducer from "./stationStateSlice"

export const store = configureStore({
  reducer: {
    mapState: mapStateReducer,
    stationState: stationStateReducer,
  },
})

export type AppDispatch = typeof store.dispatch
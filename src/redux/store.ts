import { configureStore } from "@reduxjs/toolkit"
import mapStateReducer from "./map/slice"
import messageReducer from "./message/slice"
import stationStateReducer from "./station/slice"

export const store = configureStore({
  reducer: {
    mapState: mapStateReducer,
    stationState: stationStateReducer,
    messageState: messageReducer,
  },
})

export type AppDispatch = typeof store.dispatch
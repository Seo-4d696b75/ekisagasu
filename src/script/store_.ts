import {configureStore} from "@reduxjs/toolkit"
import mapStateReducer from "./mapStateSlice"

export const store = configureStore({
  reducer: {
    mapState: mapStateReducer,
  },
})

export type AppDispatch = typeof store.dispatch
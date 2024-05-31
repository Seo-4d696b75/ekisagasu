import { createSlice } from "@reduxjs/toolkit";
import { appendLoadedStation, clearLoadedStation, setDataType } from "./actions";
import { StationDataState } from "./stationState";

const initState: StationDataState = {
  dataType: null,
  stations: [],
}

const stationDataSlice = createSlice({
  name: 'station',
  initialState: initState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(setDataType, (state, action) => {
        state.dataType = action.payload
      })
      .addCase(appendLoadedStation, (state, action) => {
        state.stations = [
          ...state.stations,
          ...action.payload,
        ]
      })
      .addCase(clearLoadedStation, (state, _) => {
        state.stations = []
      })
  }
})

export default stationDataSlice.reducer

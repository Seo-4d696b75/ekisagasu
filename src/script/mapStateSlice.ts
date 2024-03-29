import { createSlice } from "@reduxjs/toolkit"
import { DialogType, isStationDialog, NavState, NavType } from "../components/navState"
import { appendLoadedStation, clearLoadedStation, requestShowHighVoronoi, requestShowLine, requestShowPolyline, requestShowSelectedPosition, requestShowStationPromise, setCurrentLocation, setDataType, setHighAccuracyLocation, setMapCenter, setNavStateIdle, setRadarK, setShowStationPin, setWatchCurrentLocation } from "./actions"
import { createEvent, createIdleEvent } from "./event"
import { GlobalMapState } from "./mapState"

const initUserSetting: GlobalMapState = {
  radarK: 18,
  watchCurrentLocation: false,
  showStationPin: true,
  dataType: null,
  isHighAccuracyLocation: false,
  currentLocation: null,
  nav: {
    type: NavType.LOADING,
    data: null
  },
  mapCenter: {
    lat: 35.681236,
    lng: 139.767125,
    zoom: 14,
  },
  mapFocusRequest: createIdleEvent(),
  stations: [],
}

export const userSettingSlice = createSlice({
  name: "map",
  initialState: initUserSetting,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(setRadarK.fulfilled, (state, action) => {
        state.radarK = action.payload.k
        state.nav = (action.payload.nav ?? state.nav)
      })
      .addCase(setWatchCurrentLocation.fulfilled, (state, action) => {
        state.watchCurrentLocation = action.payload
        state.nav = {
          type: NavType.IDLE,
          data: {
            dialog: null
          }
        }
      })
      .addCase(setShowStationPin, (state, action) => {
        state.showStationPin = action.payload
      })
      .addCase(setHighAccuracyLocation.fulfilled, (state, action) => {
        state.isHighAccuracyLocation = action.payload
      })
      .addCase(setCurrentLocation.fulfilled, (state, action) => {
        const { nav, location } = action.payload
        state.nav = nav
        state.currentLocation = location
      })
      .addCase(requestShowSelectedPosition.fulfilled, (state, action) => {
        state.nav = action.payload.nav
        state.mapFocusRequest = createEvent(action.payload.focus)
      })
      .addCase(requestShowStationPromise.fulfilled, (state, action) => {
        state.nav = action.payload.nav
        state.mapFocusRequest = createEvent(action.payload.focus)
      })
      .addCase(requestShowLine.pending, (state, action) => {
        let line = action.meta.arg
        let next: NavState = {
          type: NavType.DIALOG_LINE,
          data: {
            dialog: {
              type: DialogType.LINE,
              props: {
                line: line,
              }
            },
            polylineList: [],
            stationMakers: [],
            showPolyline: false,
          }
        }
        state.nav = next
      })
      .addCase(requestShowLine.fulfilled, (state, action) => {
        state.nav = action.payload.nav
      })
      .addCase(requestShowPolyline, (state, action) => {
        state.nav = {
          type: NavType.DIALOG_LINE,
          data: {
            dialog: action.payload.dialog,
            showPolyline: true,
            polylineList: action.payload.polylines,
            stationMakers: action.payload.stations
          }
        }
      })
      .addCase(requestShowHighVoronoi, (state, action) => {
        if (isStationDialog(state.nav)) {
          state.nav.data.showHighVoronoi = true
        }
      })
      .addCase(setNavStateIdle.fulfilled, (state, action) => {
        state.nav = action.payload
      })
      .addCase(appendLoadedStation, (state, action) => {
        state.stations = [
          ...state.stations,
          ...action.payload,
        ]
      })
      .addCase(setDataType, (state, action) => {
        state.dataType = action.payload
      })
      .addCase(clearLoadedStation, (state, action) => {
        state.stations = []
      })
      .addCase(setMapCenter, (state, action) => {
        state.mapCenter = action.payload
      })
  }
})

export default userSettingSlice.reducer
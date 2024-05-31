import { createSlice } from "@reduxjs/toolkit"
import { DialogType, isStationDialog, NavState, NavType } from "../../components/navState"
import { requestCurrentLocation, requestShowHighVoronoi, requestShowLine, requestShowPolyline, requestShowSelectedPosition, requestShowStationPromise, setCurrentLocation, setHighAccuracyLocation, setMapCenter, setNavStateIdle, setRadarK, setShowStationPin, setWatchCurrentLocation } from "../actions"
import { GlobalMapState } from "./state"

const initUserSetting: GlobalMapState = {
  radarK: 18,
  showStationPin: true,
  isHighAccuracyLocation: false,
  currentLocation: {
    type: 'idle',
  },
  nav: {
    type: NavType.LOADING,
    data: null
  },
  mapCenter: {
    lat: 35.681236,
    lng: 139.767125,
    zoom: 14,
  },
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
        state.currentLocation = action.payload
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
      .addCase(requestCurrentLocation.fulfilled, (state, action) => {
        if (action.payload) {
          state.mapCenter = {
            lat: action.payload.lat,
            lng: action.payload.lng,
            zoom: state.mapCenter.zoom,
          }
        }
        if (state.currentLocation.type === 'watch') {
          state.currentLocation.autoScroll = true
        }
      })
      .addCase(setCurrentLocation.fulfilled, (state, action) => {
        const { nav, location } = action.payload
        state.nav = nav
        state.currentLocation = location
      })
      .addCase(requestShowSelectedPosition.pending, (state, _) => {
        if (state.currentLocation.type === 'watch') {
          state.currentLocation.autoScroll = false
        }
      })
      .addCase(requestShowSelectedPosition.fulfilled, (state, action) => {
        state.nav = action.payload.nav
        state.mapCenter = {
          lat: action.payload.focus.lat,
          lng: action.payload.focus.lng,
          zoom: action.payload.focus.zoom ?? state.mapCenter.zoom,
        }
      })
      .addCase(requestShowStationPromise.pending, (state, _) => {
        if (state.currentLocation.type === 'watch') {
          state.currentLocation.autoScroll = false
        }
      })
      .addCase(requestShowStationPromise.fulfilled, (state, action) => {
        state.nav = action.payload.nav
        state.mapCenter = {
          ...action.payload.focus,
          zoom: state.mapCenter.zoom,
        }
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
        if (state.currentLocation.type === 'watch') {
          state.currentLocation.autoScroll = false
        }
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
      .addCase(setMapCenter, (state, action) => {
        state.mapCenter = action.payload
      })
  }
})

export default userSettingSlice.reducer
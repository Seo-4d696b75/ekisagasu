import { createSlice } from "@reduxjs/toolkit"
import { DialogType, isStationDialog, NavState, NavType } from "../../components/navState"
import { requestCurrentLocation, requestShowLine, requestShowPolyline, requestShowSelectedPosition, requestShowStation, setCurrentLocation, setHighAccuracyLocation, setHighVoronoiPolygon, setMapCenter, setNavStateIdle, setRadarK, setShowStationPin, setUserDragging, setWatchCurrentLocation, startHighVoronoiCalculation } from "../actions"
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
  isUserDragging: false,
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
          if (state.currentLocation.location) {
            // 直近の位置情報があれば移動する
            state.mapCenter = {
              ...state.currentLocation.location.position,
              zoom: state.mapCenter.zoom,
            }
          }
        }
      })
      .addCase(setCurrentLocation.fulfilled, (state, action) => {
        const { nav, current } = action.payload
        state.nav = nav
        state.currentLocation = current
        if (current.type === 'watch' && current.location && current.autoScroll) {
          // 地図中心位置を自動追従
          state.mapCenter = {
            ...current.location.position,
            zoom: state.mapCenter.zoom,
          }
        }
      })
      .addCase(setUserDragging, (state, action) => {
        state.isUserDragging = action.payload
        if (action.payload && state.currentLocation.type === 'watch') {
          // ユーザー操作が開始したら自動追従は停止する
          state.currentLocation.autoScroll = false
        }
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
      .addCase(requestShowStation.pending, (state, _) => {
        if (state.currentLocation.type === 'watch') {
          state.currentLocation.autoScroll = false
        }
      })
      .addCase(requestShowStation.fulfilled, (state, action) => {
        state.nav = action.payload.nav
        state.mapCenter = {
          ...action.payload.focus,
          zoom: state.mapCenter.zoom,
        }
      })
      .addCase(requestShowLine.pending, (state, action) => {
        let line = action.meta.arg
        if (typeof line === 'object') {
          // 可能なら詳細無しの路線情報ダイアログを先に表示する
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
        }
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
        state.mapCenter = action.payload.center
      })
      .addCase(startHighVoronoiCalculation, (state, _) => {
        if (isStationDialog(state.nav)) {
          state.nav.data.highVoronoi = []
        }
      })
      .addCase(setHighVoronoiPolygon, (state, action) => {
        if (isStationDialog(state.nav)) {
          state.nav.data.highVoronoi = [
            ...state.nav.data.highVoronoi!!,
            action.payload,
          ]
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
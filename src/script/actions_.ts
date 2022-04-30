import { createAction, createAsyncThunk } from "@reduxjs/toolkit";
import { DialogType, IdleNav, LineDialogNav, LineDialogProps, NavState, NavType, RadarStation, StationDialogNav } from "../components/MapNavState";
import { LatLng, PolylineProps } from "./Utils";
import StationService from "./StationService"
import { GlobalMapState } from "./mapStateSlice";
import { RootState } from "./store_";
import { Station } from "./Station";
import { Line } from "./Line";
import { StationSuggestion } from "../components/StationSearchBox";
import { Dispatch } from "react";

export const setRadarK = createAsyncThunk(
  "map/setRadarK",
  async (k: number, thunkAPI) => {
    let { mapState } = thunkAPI.getState() as RootState
    let nav = await checkRadarK(mapState.radarK, k, mapState)
    return {
      k: k,
      nav: nav,
    }
  }
)

export const setWatchCurrentLocation = createAsyncThunk(
  "map/setWatchCurrentLocation",
  async (watch: boolean, thunkAPI) => {
    let { mapState } = thunkAPI.getState() as RootState
    return {
      watch: watch,
      nav: (mapState.nav.type === NavType.IDLE) ?
        await nextIdleNavState(mapState) : null
    }
  }
)

export const setShowStationPin = createAction<boolean>(
  "map/setShowStationPin"
)

export const setHighAccuracyLocation = createAction<boolean>(
  "map/setHighAccuracyLocation"
)

export const setCurrentLocation = createAction<GeolocationPosition>(
  "map/setCurrentLocation"
)

export const requestShowSelectedPosition = createAsyncThunk(
  "map/requestShowPosition",
  async (pos: LatLng, thunkAPI) => {
    const { mapState } = thunkAPI.getState() as RootState
    let station = await StationService.update_location(pos, mapState.radarK, 0)
    if (!station) throw Error("fail to find any station near requested position")
    let next: NavState = {
      type: NavType.DIALOG_SELECT_POS,
      data: {
        dialog: {
          type: DialogType.SELECT_POSITION,
          props: {
            station: station,
            radarList: makeRadarList(pos, mapState.radarK),
            prefecture: StationService.get_prefecture(station.prefecture),
            position: pos,
            dist: StationService.measure(station.position, pos),
            lines: station.lines.map(code => StationService.get_line(code)),
          },
        },
        showHighVoronoi: false,
      },
    }
    return {
      nav: next,
      focus: pos,
    }
  }
)

export const requestShowStation = (s: Station) => requestShowStationPromise(
  Promise.resolve(s)
)

export const requestShowStationPromise = createAsyncThunk(
  "map/requestShowStation",
  async (stationProvider: Promise<Station>, thunkAPI) => {
    let s = await stationProvider
    const { mapState } = thunkAPI.getState() as RootState
    await StationService.update_location(s.position, mapState.radarK, 0)
    let next: NavState = {
      type: NavType.DIALOG_STATION_POS,
      data: {
        dialog: {
          type: DialogType.STATION,
          props: {
            station: s,
            radarList: makeRadarList(s.position, mapState.radarK),
            prefecture: StationService.get_prefecture(s.prefecture),
            lines: s.lines.map(code => StationService.get_line(code)),
          }
        },
        showHighVoronoi: false,
      }
    }
    return {
      nav: next,
      focus: s.position,
      station: s,
    }
  }
)
  

export const requestShowLine = createAsyncThunk(
  "map/requestShowLine",
  async (line: Line) => {
    let l = await StationService.get_line_detail(line.code)
    let next: LineDialogNav = {
      type: NavType.DIALOG_LINE,
      data: {
        dialog: {
          type: DialogType.LINE,
          props: {
            line: l,
            line_details: line.has_details,
          }
        },
        polylineList: [],
        stationMakers: [],
        showPolyline: false,
      }
    }
    return {
      nav: next,
      line: l,
    }
  }
)

export const requestShowPolyline = createAction<{
  dialog: LineDialogProps,
  polylines: PolylineProps[],
  stations: LatLng[],
}>(
  "map/requestShowPolyline"
)

export const requestShowHighVoronoi = createAction<StationDialogNav>(
  "map/requestShowHighVoronoi"
)

export const requestShowStationItem = (item: StationSuggestion) => {
  switch (item.type) {
		case "station": {
			return requestShowStationPromise(StationService.get_station(item.code))
		}
		case "line": {
			let line = StationService.get_line(item.code)
			return requestShowLine(line)
		}
	}
}

export const setNavStateIdle = createAsyncThunk(
  "map/setNavStateIdle",
  async (_, thunkAPI) => {
    const {mapState} = thunkAPI.getState() as RootState
    return await nextIdleNavState(mapState)
  }
)

export const appendLoadedStation = createAction<Station[]>(
  "map/appendLoadedStation"
)

/**
 * k値が変化したときに必要なら新しいMapNavStateを生成する
 */
async function checkRadarK(oldK: number, k: number, state: GlobalMapState): Promise<NavState | null> {
  const checker = async (pos: LatLng): Promise<Array<RadarStation>> => {
    // have to update rakar list, which depneds on radar-k
    if (k > oldK) {
      // have to update location search
      await StationService.update_location(pos, k, 0)
    }
    return makeRadarList(pos, k)
  }
  const current = state.nav
  switch (current.type) {
    case NavType.DIALOG_STATION_POS:
    case NavType.DIALOG_SELECT_POS: {
      var list = await checker(current.data.dialog.props.station.position)
      current.data.dialog.props.radarList = list
      return {
        ...current,
      }
    }
    case NavType.IDLE: {
      if (state.watchCurrentLocation && state.currentLocation) {
        var pos = {
          lat: state.currentLocation.position.lat(),
          lng: state.currentLocation.position.lng()
        }
        list = await checker(pos)
        return nextIdleNavStateWatchinLocation(pos, list)
      }
      return null
    }
    default:
  }
  return null
}

function makeRadarList(pos: LatLng, k: number): RadarStation[] {
  if (!StationService.tree) throw Error("Kd-tree not initialized yet")
  return StationService.tree.getNearStations(k).map(s => {
    return {
      station: s,
      dist: StationService.measure(s.position, pos),
      lines: s.lines.map(code => StationService.get_line(code).name).join(' '),
    }
  })
}


async function nextIdleNavState(state: GlobalMapState): Promise<IdleNav> {
  const location = state.currentLocation
  if (state.watchCurrentLocation && location) {
    const pos = { lat: location.position.lat(), lng: location.position.lng() }
    let station = await StationService.update_location(pos, state.radarK)
    if (!station) throw Error("fail to update idle state")
    return nextIdleNavStateWatchinLocation(pos, makeRadarList(pos, state.radarK))
  } else {
    return {
      type: NavType.IDLE,
      data: {
        dialog: null
      }
    }
  }
}

function nextIdleNavStateWatchinLocation(pos: LatLng, list: RadarStation[]): IdleNav {
  const station = list[0].station
  return {
    type: NavType.IDLE,
    data: {
      dialog: {
        type: DialogType.CURRENT_POSITION,
        props: {
          station: station,
          radarList: list,
          prefecture: StationService.get_prefecture(station.prefecture),
          position: pos,
          dist: StationService.measure(station.position, pos),
          lines: station.lines.map(code => StationService.get_line(code)),
        }
      },
    },
  }
}
import { createAction, createAsyncThunk } from "@reduxjs/toolkit";
import { copyNavState, DialogType, IdleNav, LineDialogNav, LineDialogProps, NavState, NavType, RadarStation, StationDialogNav } from "../components/MapNavState";
import { StationSuggestion } from "../components/StationSearchBox";
import { Line } from "./Line";
import { CurrentLocation, LatLng } from "./location";
import { GlobalMapState, RootState } from "./mapState";
import { Station } from "./Station";
import StationService from "./StationService";
import { PolylineProps } from "./Utils";

export const setRadarK = createAsyncThunk(
  "map/setRadarK",
  async (k: number, thunkAPI) => {
    let { mapState } = thunkAPI.getState() as RootState
    let nav = await checkRadarK(k, mapState)
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
    StationService.watch_current_position(watch)
    return {
      watch: watch,
      nav: (mapState.nav.type === NavType.IDLE && mapState.currentLocation) ?
        await nextIdleNavStateWatchinLocation(mapState.currentLocation.position, mapState.radarK)
        : null
    }
  }
)

export const setShowStationPin = createAction<boolean>(
  "map/setShowStationPin"
)

export const setHighAccuracyLocation = createAsyncThunk(
  "map/setHighAccuracyLocation",
  async (high: boolean) => {
    StationService.set_position_accuracy(high)
    return high
  }
)

export const setCurrentLocation = createAsyncThunk(
  "map/setCurrentLocation",
  async (loc: GeolocationPosition) => {
    const coords = loc.coords
    let location: CurrentLocation = {
      position: { lat: coords.latitude, lng: coords.longitude },
      accuracy: coords.accuracy,
      heading: coords.heading
    }
    return location
  }
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

export const requestShowHighVoronoi = createAction<void>(
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
    const { mapState } = thunkAPI.getState() as RootState
    return await nextIdleNavState(mapState)
  }
)

export const appendLoadedStation = createAction<Station[]>(
  "map/appendLoadedStation"
)

/**
 * k値が変化したときに必要なら新しいMapNavStateを生成する
 */
async function checkRadarK(k: number, state: GlobalMapState): Promise<NavState | null> {
  const current = state.nav
  switch (current.type) {
    case NavType.DIALOG_STATION_POS:
    case NavType.DIALOG_SELECT_POS: {
      let pos = current.data.dialog.props.station.position
      await StationService.update_location(pos, k)
      let list = makeRadarList(pos, k)
      let next = copyNavState(current) as StationDialogNav
      next.data.dialog.props.radarList = list
      return next
    }
    case NavType.IDLE: {
      if (state.watchCurrentLocation && state.currentLocation) {
        let pos = state.currentLocation.position
        return nextIdleNavStateWatchinLocation(pos, k)
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
    const pos = location.position
    return await nextIdleNavStateWatchinLocation(pos, state.radarK)
  } else {
    return {
      type: NavType.IDLE,
      data: {
        dialog: null
      }
    }
  }
}

async function nextIdleNavStateWatchinLocation(pos: LatLng, k: number): Promise<IdleNav> {
  const station = await StationService.update_location(pos, k)
  if (!station) throw Error("fail to update idle state")
  const list = makeRadarList(pos, k)
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
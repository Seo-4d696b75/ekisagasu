import { createAction, createAsyncThunk } from "@reduxjs/toolkit";
import { StationSuggestion } from "../components/header/StationSearchBox";
import { DialogType, IdleNav, LineDialogNav, LineDialogProps, NavState, NavType, RadarStation, StationDialogNav, copyNavState } from "../components/navState";
import StationService, { DataType } from "./StationService";
import { Line } from "./line";
import { CurrentLocation, CurrentLocationState, LatLng, MapCenter } from "./location";
import { GlobalMapState, RootState } from "./mapState";
import { Station } from "./station";
import { PolylineProps, measure } from "./utils";

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
  async (watch: boolean): Promise<CurrentLocationState> => {
    StationService.setWatchCurrentPosition(watch)
    return watch ? {
      type: 'watch',
      autoScroll: true,
      location: null,
    } : {
      type: 'idle',
    }
  }
)

export const setDataType = createAction<DataType>(
  "map/setDataExtra",
)

export const setShowStationPin = createAction<boolean>(
  "map/setShowStationPin"
)

export const setHighAccuracyLocation = createAsyncThunk(
  "map/setHighAccuracyLocation",
  async (high: boolean) => {
    StationService.setPositionHighAccuracy(high)
    return high
  }
)

export const requestCurrentLocation = createAsyncThunk(
  "map/requestCurrentLocation",
  async (_, thunkAPI): Promise<LatLng | undefined> => {
    const { mapState } = thunkAPI.getState() as RootState
    if (mapState.currentLocation.type === 'watch') {
      return undefined
    } else {
      const pos = await StationService.getCurrentPosition()
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }
    }
  }
)

export const setCurrentLocation = createAsyncThunk(
  "map/setCurrentLocation",
  async (loc: GeolocationPosition, thunkAPI): Promise<{
    nav: NavState,
    location: CurrentLocationState,
  }> => {
    const { mapState } = thunkAPI.getState() as RootState
    if (mapState.currentLocation.type === 'watch') {
      const coords = loc.coords
      let location: CurrentLocation = {
        position: { lat: coords.latitude, lng: coords.longitude },
        accuracy: coords.accuracy,
        heading: coords.heading
      }
      // 現在地のダイアログを更新
      return {
        nav: mapState.nav.type === NavType.IDLE
          ? await nextIdleNavStateWatchingLocation(location.position, mapState.radarK)
          : mapState.nav,
        location: {
          type: 'watch',
          location: location,
          autoScroll: mapState.currentLocation.autoScroll,
        },
      }
    } else {
      return {
        nav: mapState.nav,
        location: mapState.currentLocation,
      }
    }

  }
)

export const requestShowSelectedPosition = createAsyncThunk(
  "map/requestShowPosition",
  async (target: { pos: LatLng, zoom?: number }, thunkAPI) => {
    const { mapState } = thunkAPI.getState() as RootState
    let station = await StationService.updateLocation(target.pos, mapState.radarK, 0)
    if (!station) throw Error("fail to find any station near requested position")
    let next: NavState = {
      type: NavType.DIALOG_SELECT_POS,
      data: {
        dialog: {
          type: DialogType.SELECT_POSITION,
          props: {
            station: station,
            radarList: makeRadarList(target.pos, mapState.radarK),
            prefecture: StationService.getPrefecture(station.prefecture),
            position: target.pos,
            dist: measure(station.position, target.pos),
            lines: station.lines.map(code => StationService.getLine(code)),
          },
        },
        showHighVoronoi: false,
      },
    }
    return {
      nav: next,
      focus: target,
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
    await StationService.updateLocation(s.position, mapState.radarK, 0)
    let next: NavState = {
      type: NavType.DIALOG_STATION_POS,
      data: {
        dialog: {
          type: DialogType.STATION,
          props: {
            station: s,
            radarList: makeRadarList(s.position, mapState.radarK),
            prefecture: StationService.getPrefecture(s.prefecture),
            lines: s.lines.map(code => StationService.getLine(code)),
          }
        },
        showHighVoronoi: false,
      }
    }
    return {
      nav: next,
      focus: {
        pos: s.position,
        zoom: undefined,
      },
      station: s,
    }
  }
)


export const requestShowLine = createAsyncThunk(
  "map/requestShowLine",
  async (line: Line) => {
    let l = await StationService.getLineDetail(line.code)
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
  stations: Station[],
}>(
  "map/requestShowPolyline"
)

export const requestShowHighVoronoi = createAction<void>(
  "map/requestShowHighVoronoi"
)

export const requestShowStationItem = (item: StationSuggestion) => {
  switch (item.type) {
    case "station": {
      return requestShowStationPromise(StationService.getStation(item.code))
    }
    case "line": {
      let line = StationService.getLine(item.code)
      return requestShowLine(line)
    }
  }
}

export const setNavStateIdle = createAsyncThunk(
  "map/setNavStateIdle",
  async (_, thunkAPI) => {
    const { mapState } = thunkAPI.getState() as RootState
    return await nextIdleNavState(
      mapState.currentLocation,
      mapState.radarK,
    )
  }
)

export const appendLoadedStation = createAction<Station[]>(
  "map/appendLoadedStation"
)

export const clearLoadedStation = createAction<void>(
  "map/clearLoadedStation"
)

export const setMapCenter = createAction<MapCenter>(
  "map/setMapCenter"
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
      await StationService.updateLocation(pos, k)
      let list = makeRadarList(pos, k)
      let next = copyNavState(current) as StationDialogNav
      next.data.dialog.props.radarList = list
      return next
    }
    case NavType.IDLE: {
      if (state.currentLocation.type === 'watch' && state.currentLocation.location) {
        let pos = state.currentLocation.location.position
        return nextIdleNavStateWatchingLocation(pos, k)
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
      dist: measure(s.position, pos),
      lines: s.lines.map(code => StationService.getLine(code).name).join(' '),
    }
  })
}


async function nextIdleNavState(
  currentLocation: CurrentLocationState,
  k: number,
): Promise<IdleNav> {
  if (currentLocation.type === 'watch' && currentLocation.location) {
    const pos = currentLocation.location.position
    return await nextIdleNavStateWatchingLocation(pos, k)
  } else {
    return {
      type: NavType.IDLE,
      data: {
        dialog: null
      }
    }
  }
}

async function nextIdleNavStateWatchingLocation(pos: LatLng, k: number): Promise<IdleNav> {
  const station = await StationService.updateLocation(pos, k)
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
          prefecture: StationService.getPrefecture(station.prefecture),
          position: pos,
          dist: measure(station.position, pos),
          lines: station.lines.map(code => StationService.getLine(code)),
        }
      },
    },
  }
}
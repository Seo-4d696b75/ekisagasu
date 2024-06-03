import { createAction, createAsyncThunk } from "@reduxjs/toolkit";
import { StationSuggestion } from "../components/header/StationSearchBox";
import { PolylineProps, measure } from "../components/map/diagram";
import { DialogType, IdleNav, LineDialogNav, LineDialogProps, NavState, NavType, RadarStation, StationDialogNav, copyNavState } from "../components/navState";
import locationRepository from "../location/LocationRepository";
import { CurrentLocationState, LatLng, Location, MapCenter, isLatLng } from "../location/location";
import { logger } from "../logger";
import stationRepository, { DataType } from "../station/StationRepository";
import { Line } from "../station/line";
import { Station } from "../station/station";
import { GlobalMapState } from "./map/state";
import { RootState } from "./selector";

// StationDataState

export const setDataType = createAction<DataType>(
  "station/setDataExtra",
)

export const appendLoadedStation = createAction<Station[]>(
  "station/appendLoadedStation"
)

export const clearLoadedStation = createAction<void>(
  "station/clearLoadedStation"
)

// GlobalMapState

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
    locationRepository.setWatchCurrentPosition(watch)
    return watch ? {
      type: 'watch',
      location: null,
      autoScroll: true,
    } : {
      type: 'idle',
    }
  }
)

export const setShowStationPin = createAction<boolean>(
  "map/setShowStationPin"
)

export const setHighAccuracyLocation = createAsyncThunk(
  "map/setHighAccuracyLocation",
  async (high: boolean) => {
    locationRepository.setPositionHighAccuracy(high)
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
      try {
        const pos = await locationRepository.getCurrentLocation()
        return pos.position
      } catch (err) {
        logger.w(err)
        alert("現在位置を利用できません. ブラウザから位置情報へのアクセスを許可してください.")
        return undefined
      }
    }
  }
)

export const setCurrentLocation = createAsyncThunk(
  "map/setCurrentLocation",
  async (location: Location, thunkAPI): Promise<{
    nav: NavState,
    current: CurrentLocationState,
  }> => {
    const { mapState } = thunkAPI.getState() as RootState
    if (mapState.currentLocation.type === 'watch') {
      // 現在地のダイアログを更新
      return {
        nav: mapState.nav.type === NavType.IDLE
          ? await nextIdleNavStateWatchingLocation(location.position, mapState.radarK)
          : mapState.nav,
        current: {
          type: 'watch',
          location: location,
          autoScroll: mapState.currentLocation.autoScroll,
        },
      }
    } else {
      return {
        nav: mapState.nav,
        current: mapState.currentLocation,
      }
    }
  }
)

export const setUserDragging = createAction<boolean>(
  "map/setUserDragging",
)

export const requestShowSelectedPosition = createAsyncThunk(
  "map/requestShowPosition",
  async (target: LatLng & { zoom?: number }, thunkAPI) => {
    const { mapState } = thunkAPI.getState() as RootState
    const list = await makeRadarList(target, mapState.radarK)
    const station = list[0].station
    let next: NavState = {
      type: NavType.DIALOG_SELECT_POS,
      data: {
        dialog: {
          type: DialogType.SELECT_POSITION,
          props: {
            station: station,
            radarList: list,
            prefecture: stationRepository.getPrefecture(station.prefecture),
            position: target,
            dist: measure(station.position, target),
            lines: station.lines.map(code => stationRepository.getLine(code)),
          },
        },
        highVoronoi: null,
      },
    }
    return {
      nav: next,
      focus: target,
    }
  }
)

export const requestShowStation = createAsyncThunk(
  "map/requestShowStation",
  async (station: Station | LatLng | string | number, thunkAPI) => {
    const s = (typeof station === 'string')
      ? await stationRepository.getStationById(station)
      : (typeof station === 'number')
        ? await stationRepository.getStation(station)
        : isLatLng(station)
          ? (await stationRepository.search(station, 1))[0].station
          : station
    const { mapState } = thunkAPI.getState() as RootState
    let next: NavState = {
      type: NavType.DIALOG_STATION_POS,
      data: {
        dialog: {
          type: DialogType.STATION,
          props: {
            station: s,
            radarList: await makeRadarList(s.position, mapState.radarK),
            prefecture: stationRepository.getPrefecture(s.prefecture),
            lines: s.lines.map(code => stationRepository.getLine(code)),
          }
        },
        highVoronoi: null,
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
  async (line: Line | string) => {
    const l = (typeof line === 'string')
      ? stationRepository.getLineById(line)
      : line
    const detail = await stationRepository.getLineDetail(l.code)
    let next: LineDialogNav = {
      type: NavType.DIALOG_LINE,
      data: {
        dialog: {
          type: DialogType.LINE,
          props: {
            line: detail,
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

export const startHighVoronoiCalculation = createAction<void>(
  "map/startHighVoronoiCalculation"
)

export const setHighVoronoiPolygon = createAction<LatLng[]>(
  "map/setHighVoronoiPolygon"
)

export const requestShowStationItem = (item: StationSuggestion) => {
  switch (item.type) {
    case "station": {
      return requestShowStation(item.code)
    }
    case "line": {
      let line = stationRepository.getLine(item.code)
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
      let list = await makeRadarList(pos, k)
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

async function makeRadarList(pos: LatLng, k: number): Promise<RadarStation[]> {
  const nearest = await stationRepository.search(pos, k)
  return nearest.map(s => ({
    station: s.station,
    dist: measure(s.station.position, pos),
    lines: s.station.lines.map(code => stationRepository.getLine(code).name).join(' '),
  }))
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
  const list = await makeRadarList(pos, k)
  const station = list[0].station
  return {
    type: NavType.IDLE,
    data: {
      dialog: {
        type: DialogType.CURRENT_POSITION,
        props: {
          station: station,
          radarList: list,
          prefecture: stationRepository.getPrefecture(station.prefecture),
          position: pos,
          dist: measure(station.position, pos),
          lines: station.lines.map(code => stationRepository.getLine(code)),
        }
      },
    },
  }
}
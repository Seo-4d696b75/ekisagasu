import { Reducer } from "redux"
import { DialogType, InfoDialog, MapTransition } from "../components/Map"
import { createEvent, createIdleEvent, PropsEvent } from "./Event"
import { Station } from "./Station"
import { LatLng } from "./Utils"

export enum ActionType {
  SET_RADER_K,
  WATCH_CURRENT_POSITION,
  SHOW_STATION_PIN,
  SET_CURRENT_POSITION,
  SET_GPS_ACCURACY,
  SHOW_STATION_ITEM,
  SET_TRANSITION,
  LOAD_STATIONS,
}

interface Action<TAction, TPayload = null> {
  type: TAction
  payload: TPayload
}

type RadarAction = Action<ActionType.SET_RADER_K, { k: number }>
type WatchPositionAction = Action<ActionType.WATCH_CURRENT_POSITION, { watch: boolean }>
type ShowStationPinAction = Action<ActionType.SHOW_STATION_PIN, { show: boolean }>
type PositionAction = Action<ActionType.SET_CURRENT_POSITION, { pos: GeolocationPosition }>
type GPSAccuracyAction = Action<ActionType.SET_GPS_ACCURACY, { high: boolean }>
type ShowAction = Action<ActionType.SHOW_STATION_ITEM, InfoDialog>
type TransitionAction = Action<ActionType.SET_TRANSITION, { current: MapTransition }>
type LoadStationsAction = Action<ActionType.LOAD_STATIONS, { stations: Array<Station> }>

export type GlobalAction =
  RadarAction |
  WatchPositionAction |
  ShowStationPinAction |
  PositionAction |
  GPSAccuracyAction |
  ShowAction |
  TransitionAction |
  LoadStationsAction

export interface GlobalState {
  radar_k: number
  watch_position: boolean
  show_station_pin: boolean
  current_position: GeolocationPosition | null
  high_accuracy: boolean,
  info_dialog: InfoDialog | null
  transition: MapTransition
  map_focus: PropsEvent<LatLng>
  stations: Array<Station>
}

const initState: GlobalState = {
  radar_k: 22,
  watch_position: false,
  show_station_pin: true,
  current_position: null,
  high_accuracy: false,
  info_dialog: null,
  transition: "loading",
  map_focus: createIdleEvent(),
  stations: [],
}

const reducer: Reducer<GlobalState, GlobalAction> = (
  state: GlobalState = initState,
  action: GlobalAction
): GlobalState => {
  switch (action.type) {
    case ActionType.SET_RADER_K: {
      return {
        ...state,
        radar_k: action.payload.k
      }
    }
    case ActionType.WATCH_CURRENT_POSITION: {
      return {
        ...state,
        watch_position: action.payload.watch
      }
    }
    case ActionType.SHOW_STATION_PIN: {
      return {
        ...state,
        show_station_pin: action.payload.show
      }
    }
    case ActionType.SET_CURRENT_POSITION: {
      return {
        ...state,
        current_position: action.payload.pos
      }
    }
    case ActionType.SET_GPS_ACCURACY: {
      return {
        ...state,
        high_accuracy: action.payload.high
      }
    }
    case ActionType.SHOW_STATION_ITEM: {
      var update = (t: MapTransition, focus?: LatLng) => {
        return {
          ...state,
          info_dialog: action.payload,
          transition: t,
          map_focus: (focus ? createEvent(focus) : state.map_focus)
        }
      }
      switch (action.payload.type) {
        case DialogType.Line:
          return update({
            show_polyline: false,
            polyline_list: [],
            stations_marker: [],
          })
        case DialogType.Position:
          return update({
            show_high_voronoi: false,
            station: action.payload.props.station,
            location: action.payload.props.location.pos
          }, action.payload.props.location.pos)
        case DialogType.Station:
          return update({
            show_high_voronoi: false,
            station: action.payload.props.station,
            location: undefined,
          }, action.payload.props.station.position)
      }
      break
    }
    case ActionType.SET_TRANSITION: {
      return {
        ...state,
        transition: action.payload.current
      }
    }
    case ActionType.LOAD_STATIONS: {
      var list = [...state.stations]
      action.payload.stations.forEach(s => list.push(s))
      return {
        ...state,
        stations: list,
      }
    }
  }
  return state
}

export default reducer
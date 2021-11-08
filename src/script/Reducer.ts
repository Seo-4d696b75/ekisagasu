import { Reducer } from "redux"
import { InfoDialogNav, NavState, NavType } from "../components/Map"
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
  SET_NAV_STATE,
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
type ShowAction = Action<ActionType.SHOW_STATION_ITEM, InfoDialogNav>
type TransitionAction = Action<ActionType.SET_NAV_STATE, { current: NavState }>
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
  current_position: PropsEvent<GeolocationPosition>
  high_accuracy: boolean,
  nav: NavState,
  map_focus: PropsEvent<LatLng>
  stations: Array<Station>
}

const initState: GlobalState = {
  radar_k: 22,
  watch_position: false,
  show_station_pin: true,
  current_position: createIdleEvent(),
  high_accuracy: false,
  nav: {
    type: NavType.LOADING,
    data: null
  },
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
        current_position: createEvent(action.payload.pos)
      }
    }
    case ActionType.SET_GPS_ACCURACY: {
      return {
        ...state,
        high_accuracy: action.payload.high
      }
    }
    case ActionType.SHOW_STATION_ITEM: {
      switch (action.payload.type) {
        case NavType.DIALOG_LINE:
          return {
            ...state,
            nav: action.payload
          }
        case NavType.DIALOG_SELECT_POS:
          return {
            ...state,
            nav: action.payload,
            map_focus: createEvent(action.payload.data.dialog.props.position)
          }
        case NavType.DIALOG_STATION_POS:
          return {
            ...state,
            nav: action.payload,
            map_focus: createEvent(action.payload.data.dialog.props.station.position)
          }
      }
      break
    }
    case ActionType.SET_NAV_STATE: {
      return {
        ...state,
        nav: action.payload.current,
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
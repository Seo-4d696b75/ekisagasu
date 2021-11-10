import { Reducer } from "redux"
import { NavState, NavType } from "../components/Map"
import { createEvent, createIdleEvent, PropsEvent } from "./Event"
import { Station } from "./Station"
import { LatLng } from "./Utils"

export enum ActionType {
  SET_RADER_K,
  WATCH_CURRENT_POSITION,
  SHOW_STATION_PIN,
  SET_CURRENT_POSITION,
  SET_GPS_ACCURACY,
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
type TransitionAction = Action<ActionType.SET_NAV_STATE, {
  next: NavState,
  focus?: LatLng
}>
type LoadStationsAction = Action<ActionType.LOAD_STATIONS, { stations: Array<Station> }>

export type GlobalAction =
  RadarAction |
  WatchPositionAction |
  ShowStationPinAction |
  PositionAction |
  GPSAccuracyAction |
  TransitionAction |
  LoadStationsAction

export interface GlobalState {
  radar_k: number
  watch_position: boolean
  show_station_pin: boolean
  current_location: null | {
    position: google.maps.LatLng,
    accuracy: number
    heading: number | null
  }
  current_location_update: PropsEvent<GeolocationPosition>
  high_accuracy: boolean,
  nav: NavState,
  map_focus: PropsEvent<LatLng>
  stations: Array<Station>
}

const initState: GlobalState = {
  radar_k: 22,
  watch_position: false,
  show_station_pin: true,
  current_location: null,
  current_location_update: createIdleEvent(),
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
      const coords = action.payload.pos.coords
      return {
        ...state,
        current_location: {
          position: new google.maps.LatLng(coords.latitude, coords.longitude),
          accuracy: coords.accuracy,
          heading: coords.heading
        },
        current_location_update: createEvent(action.payload.pos)
      }
    }
    case ActionType.SET_GPS_ACCURACY: {
      return {
        ...state,
        high_accuracy: action.payload.high
      }
    }
    case ActionType.SET_NAV_STATE: {
      if (action.payload.focus) {
        return {
          ...state,
          nav: action.payload.next,
          map_focus: createEvent(action.payload.focus)
        }
      } else {
        return {
          ...state,
          nav: action.payload.next,
        }
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
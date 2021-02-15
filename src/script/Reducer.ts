import { Reducer } from "redux"
import { DialogTransition, DialogType, InfoDialog, MapTransition } from "../components/Map"
import { Line } from "./Line"
import { Station } from "./Station"
import { LatLng } from "./Utils"

export enum ActionType {
  SET_RADER_K,
  WATCH_CURRENT_POSITION,
  SET_CURRENT_POSITION,
  SET_GPS_ACCURACY,
  SHOW_STATION_ITEM,
  SET_TRANSITION,
}

interface Action<TAction, TPayload = null> {
  type: TAction
  payload: TPayload
}

type RadarAction = Action<ActionType.SET_RADER_K, { k: number }>
type WatchPositionAction = Action<ActionType.WATCH_CURRENT_POSITION, { watch: boolean }>
type PositionAction = Action<ActionType.SET_CURRENT_POSITION, { pos: GeolocationPosition }>
type GPSAccuracyAction = Action<ActionType.SET_GPS_ACCURACY, { high: boolean }>
type ShowAction = Action<ActionType.SHOW_STATION_ITEM, InfoDialog>
type TransitionAction = Action<ActionType.SET_TRANSITION, { current: MapTransition }>

export type GlobalAction =
  RadarAction |
  WatchPositionAction |
  PositionAction |
  GPSAccuracyAction |
  ShowAction |
  TransitionAction

export interface GlobalState {
  radar_k: number
  watch_position: boolean
  current_position: GeolocationPosition | null
  high_accuracy: boolean,
  info_dialog: InfoDialog | null
  transition: MapTransition
}

const initState: GlobalState = {
  radar_k: 22,
  watch_position: false,
  current_position: null,
  high_accuracy: false,
  info_dialog: null,
  transition: "loading",
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
      var update = (t: MapTransition) => {
        return {
          ...state,
          info_dialog: action.payload,
          transition: t,
        }
      }
      switch (action.payload.type) {
        case DialogType.Line:
          return update({polyline: false})
        case DialogType.Position:
          return update({location: true, voronoi: false})
        case DialogType.Station:
          return update({location: false, voronoi: false})
      }
    }
    case ActionType.SET_TRANSITION: {
      return {
        ...state,
        transition: action.payload.current
      }
    }
  }
  return state
}

export default reducer
import {Reducer} from "redux"
import { Line } from "./Line"
import {Station} from "./Station"
import {StationSuggestion} from "../components/StationSearchBox"
import { LatLng } from "./Utils"
import { type } from "os"

export enum ActionType {
	SET_RADER_K,
	WATCH_CURRENT_POSITION,
	SET_CURRENT_POSITION,
	SET_GPS_ACCURACY,
  SHOW_STATION_ITEM,
  CLEAR_STATION_ITEM,
}

interface Action<TAction, TPayload = null>{
	type: TAction
	payload: TPayload
}

type RadarAction = Action<ActionType.SET_RADER_K, {k: number}>
type WatchPositionAction = Action<ActionType.WATCH_CURRENT_POSITION, {watch: boolean}>
type PositionAction = Action<ActionType.SET_CURRENT_POSITION, {pos: GeolocationPosition}>
type GPSAccuracyAction = Action<ActionType.SET_GPS_ACCURACY, {high: boolean}>
type ShowAction = Action<ActionType.SHOW_STATION_ITEM, ShowRequest>
type ClearShowAction = Action<ActionType.CLEAR_STATION_ITEM, null>

export type GlobalAction = 
	RadarAction |
	WatchPositionAction |
	PositionAction |
	GPSAccuracyAction |
  ShowAction | 
  ClearShowAction
  
interface StationRequest {
  type: "station"
  station: Station
}

interface LineRequest {
  type: "line"
  line: Line
}

interface PositionRequest {
  type: "position"
  pos: LatLng
}

type ShowRequest = 
  StationRequest |
  LineRequest |
  PositionRequest

export interface GlobalState {
	radar_k: number
	watch_position: boolean
	current_position: GeolocationPosition | null
  high_accuracy: boolean
  show_request: ShowRequest | null
}

const initState: GlobalState = {
  radar_k: 22,
  watch_position: false,
  current_position: null,
  high_accuracy: false,
  show_request: null
}

const reducer: Reducer<GlobalState, GlobalAction> = (
  state: GlobalState = initState,
  action: GlobalAction
): GlobalState => {
  switch(action.type){
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
      return {
        ...state,
        show_request: action.payload
      }
    }
    case ActionType.CLEAR_STATION_ITEM: {
      return {
        ...state,
        show_request: null
      }
    }
  }
  return state
}

export default reducer
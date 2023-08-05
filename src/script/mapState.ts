import { NavState } from "../components/navState"
import { PropsEvent } from "./event"
import { CurrentLocation, LatLng } from "./location"
import { Station } from "./station"

export interface GlobalMapState {
  radarK: number
  showStationPin: boolean
  isDataExtra: boolean
  isDataExtraChange: PropsEvent<boolean>
  isHighAccuracyLocation: boolean
  /**
   * GPSで現在地を監視・取得するフラグ
   */
  watchCurrentLocation: boolean
  /**
   * GPSで取得した現在位置
   */
  currentLocation: CurrentLocation | null
  /**
   * MapのUI状態
   */
  nav: NavState
  mapFocusRequest: PropsEvent<{pos: LatLng, zoom?: number}>
  stations: Station[]
}

export interface RootState {
  mapState: GlobalMapState
}

export const selectMapState = (state: RootState) => state.mapState
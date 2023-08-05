import { NavState } from "../components/navState"
import { DataType } from "./StationService"
import { PropsEvent } from "./event"
import { CurrentLocation, LatLng } from "./location"
import { Station } from "./station"

export interface GlobalMapState {
  radarK: number
  showStationPin: boolean
  /**
   * 表示する駅データの種類
   */
  dataType: DataType | null
  /**
   * GPSで現在地を監視・取得するフラグ
   */
  watchCurrentLocation: boolean
  /**
   * GPSで現在位置を取得するオプション
   */
  isHighAccuracyLocation: boolean
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
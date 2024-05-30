import { NavState } from "../components/navState"
import { DataType } from "./StationService"
import { PropsEvent } from "./event"
import { CurrentLocationState, LatLng, MapCenter } from "./location"
import { Station } from "./station"

export interface GlobalMapState {
  radarK: number
  showStationPin: boolean
  /**
   * 表示する駅データの種類
   */
  dataType: DataType | null
  /**
   * GPSで現在地を監視する状態
   */
  currentLocation: CurrentLocationState
  /**
   * GPSで現在位置を取得するオプション
   */
  isHighAccuracyLocation: boolean
  /**
   * MapのUI状態
   */
  nav: NavState
  /**
   * Map中心位置の変更リクエスト
   */
  mapFocusRequest: PropsEvent<{pos: LatLng, zoom?: number}>
  /**
   * Map中心位置
   */
  mapCenter: MapCenter
  /**
   * Mpa上に表示する駅一覧
   */
  stations: Station[]
}

export interface RootState {
  mapState: GlobalMapState
}

export const selectMapState = (state: RootState) => state.mapState
import { NavState } from "../../components/navState"
import { CurrentLocationState, MapCenter } from "../../location/location"

export interface GlobalMapState {
  radarK: number
  showStationPin: boolean
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
   * Map中心位置
   */
  mapCenter: MapCenter
}

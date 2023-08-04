import { NavState } from "../components/navState"
import { PropsEvent } from "./event"
import { CurrentLocation, LatLng } from "./location"
import { Station } from "./station"

export interface GlobalMapState {
  radarK: number
  watchCurrentLocation: boolean
  showStationPin: boolean
  isDataExtra: boolean
  isDataExtraChange: PropsEvent<boolean>
  isHighAccuracyLocation: boolean
  currentLocation: CurrentLocation | null
  currentPositionUpdate: PropsEvent<LatLng>
  nav: NavState
  mapFocusRequest: PropsEvent<{pos: LatLng, zoom?: number}>
  stations: Station[]
}

export interface RootState {
  mapState: GlobalMapState
}

export const selectMapState = (state: RootState) => state.mapState
import { NavState } from "../components/MapNavState"
import { PropsEvent } from "./Event"
import { Station } from "./Station"
import { CurrentLocation, LatLng } from "./location"

export interface GlobalMapState {
  radarK: number
  watchCurrentLocation: boolean
  showStationPin: boolean
  isHighAccuracyLocation: boolean
  currentLocation: CurrentLocation | null
  currentPositionUpdate: PropsEvent<LatLng>
  nav: NavState
  mapFocusRequest: PropsEvent<LatLng>
  stations: Station[]
}

export interface RootState {
  mapState: GlobalMapState
}

export const selectMapState = (state: RootState) => state.mapState
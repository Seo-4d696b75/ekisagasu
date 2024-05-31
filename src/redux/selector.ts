import { GlobalMapState } from "./map/state"
import { StationDataState } from "./station/state"

export interface RootState {
  mapState: GlobalMapState
  stationState: StationDataState,
}

export const selectMapState = (state: RootState) => state.mapState
export const selectStationState = (state: RootState) => state.stationState
import { GlobalMapState } from "./mapState"
import { StationDataState } from "./stationState"

export interface RootState {
  mapState: GlobalMapState
  stationState: StationDataState,
}

export const selectMapState = (state: RootState) => state.mapState
export const selectStationState = (state: RootState) => state.stationState
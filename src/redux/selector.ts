import { GlobalMapState } from "./map/state"
import { MessageState } from "./message/state"
import { StationDataState } from "./station/state"

export interface RootState {
  mapState: GlobalMapState
  stationState: StationDataState,
  messageState: MessageState,
}

export const selectMapState = (state: RootState) => state.mapState
export const selectStationState = (state: RootState) => state.stationState
export const selectMessageState = (state: RootState) => state.messageState
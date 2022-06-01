import { Line } from "../script/line"
import { LatLng } from "../script/location"
import { Station } from "../script/station"
import { PolylineProps } from "../script/utils"

export interface RadarStation {
  station: Station
  dist: number
  lines: string
}

export enum DialogType {
  STATION,
  LINE,
  SELECT_POSITION,
  CURRENT_POSITION,
}

interface DialogPropsBase<T, E> {
  type: T
  props: E
}

interface StationDialogPayload {
  station: Station
  radarList: RadarStation[]
  prefecture: string
  lines: Line[]
}

interface PosDialogPayload extends StationDialogPayload {
  position: LatLng
  dist: number
}

export type StationPosDialogProps = DialogPropsBase<DialogType.STATION, StationDialogPayload>
export type SelectPosDialogProps = DialogPropsBase<DialogType.SELECT_POSITION, PosDialogPayload>
export type CurrentPosDialogProps = DialogPropsBase<DialogType.CURRENT_POSITION, PosDialogPayload>

export type LineDialogProps = DialogPropsBase<DialogType.LINE, {
  line: Line
}>

export type StationDialogProps =
  StationPosDialogProps |
  SelectPosDialogProps |
  CurrentPosDialogProps

type DialogProps =
  StationDialogProps |
  LineDialogProps

function copyDialogProps(dialog: DialogProps): DialogProps {
  return {
    type: dialog.type,
    props: {
      ...dialog.props
    }
  } as DialogProps
}

export enum NavType {
  LOADING,
  IDLE,
  DIALOG_STATION_POS,
  DIALOG_LINE,
  DIALOG_SELECT_POS,
}

interface NavStateBase<T, E> {
  type: T
  data: E
}

export function isStationDialog(nav: NavState): nav is StationDialogNav {
  switch (nav.type) {
    case NavType.DIALOG_SELECT_POS:
    case NavType.DIALOG_STATION_POS:
      return true
    default:
      return false
  }
}

export function isInfoDialog(nav: NavState): nav is InfoDialogNav {
  switch (nav.type) {
    case NavType.DIALOG_SELECT_POS:
    case NavType.DIALOG_STATION_POS:
    case NavType.DIALOG_LINE:
      return true
    default:
      return false
  }
}

export type StationPosDialogNav = NavStateBase<NavType.DIALOG_STATION_POS, {
  dialog: StationPosDialogProps,
  showHighVoronoi: boolean
}>

export type SelectPosDialogNav = NavStateBase<NavType.DIALOG_SELECT_POS, {
  dialog: SelectPosDialogProps,
  showHighVoronoi: boolean
}>

export type LineDialogNav = NavStateBase<NavType.DIALOG_LINE, {
  dialog: LineDialogProps
  showPolyline: boolean
  polylineList: PolylineProps[]
  stationMakers: Station[]
}>

export type IdleNav = NavStateBase<NavType.IDLE, {
  dialog: CurrentPosDialogProps | null
}>

export type StationDialogNav =
  StationPosDialogNav |
  SelectPosDialogNav

export type InfoDialogNav =
  StationDialogNav |
  LineDialogNav

export type NavState =
  InfoDialogNav |
  NavStateBase<NavType.LOADING, null> |
  IdleNav

export function copyNavState(state: NavState): NavState {
  switch (state.type) {
    case NavType.DIALOG_LINE: {
      return {
        type: NavType.DIALOG_LINE,
        data: {
          dialog: copyDialogProps(state.data.dialog) as LineDialogProps,
          showPolyline: state.data.showPolyline,
          polylineList: state.data.polylineList,
          stationMakers: state.data.stationMakers,
        }
      }
    }
    case NavType.DIALOG_SELECT_POS:
    case NavType.DIALOG_STATION_POS: {
      return {
        type: state.type,
        data: {
          dialog: copyDialogProps(state.data.dialog),
          showHighVoronoi: state.data.showHighVoronoi,
        }
      } as StationDialogNav
    }
    case NavType.IDLE: {
      return {
        type: NavType.IDLE,
        data: {
          dialog: state.data.dialog ?
            copyDialogProps(state.data.dialog) as CurrentPosDialogProps
            : null
        }
      }
    }
    case NavType.LOADING: {
      return {
        type: NavType.LOADING,
        data: null,
      }
    }
  }
}
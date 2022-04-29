import { Line } from "../script/Line"
import { Station } from "../script/Station"
import * as Utils from "../script/Utils"

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
	radar_list: Array<RadarStation>
	prefecture: string
	lines: Array<Line>
}

interface PosDialogPayload extends StationDialogPayload {
	position: Utils.LatLng
	dist: number
}

export type StationPosDialogProps = DialogPropsBase<DialogType.STATION, StationDialogPayload>
export type SelectPosDialogProps = DialogPropsBase<DialogType.SELECT_POSITION, PosDialogPayload>
export type CurrentPosDialogProps = DialogPropsBase<DialogType.CURRENT_POSITION, PosDialogPayload>

export type LineDialogProps = DialogPropsBase<DialogType.LINE, {
	line: Line
	line_details: boolean
}>

export type StationDialogProps =
	StationPosDialogProps |
	SelectPosDialogProps |
	CurrentPosDialogProps

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

export function isDialog(nav: NavState): nav is InfoDialogNav {
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
	show_high_voronoi: boolean
}>

export type SelectPosDialogNav = NavStateBase<NavType.DIALOG_SELECT_POS, {
	dialog: SelectPosDialogProps,
	show_high_voronoi: boolean
}>

type LineDialogNav = NavStateBase<NavType.DIALOG_LINE, {
	dialog: LineDialogProps
	show_polyline: boolean
	polyline_list: Array<Utils.PolylineProps>
	stations_marker: Array<Utils.LatLng>
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
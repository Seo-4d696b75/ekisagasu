import { store } from "./Store"
import { ActionType, GlobalAction, GlobalState } from "./Reducer"
import { StationSuggestion } from "../components/StationSearchBox"
import { Station } from "./Station";
import { Line } from "./Line";
import StationService from "./StationService";
import { Dispatch } from "redux";
import { LatLng } from "./Utils";
import { DialogType, RadarStation, StationDialogProps, PosDialogProps, MapTransition } from "../components/Map";


async function checkRadarK(k: number, dispatch: Dispatch<GlobalAction>, state: GlobalState) {
	if (state.info_dialog) {
		var pos: LatLng | null = null
		switch (state.info_dialog.type) {
			case DialogType.Station: {
				pos = state.info_dialog.props.station.position
				break
			}
			case DialogType.Position: {
				pos = state.info_dialog.props.location.pos
				break
			}
			default:
		}
		if (!pos) return
		// have to update rakar list, which depneds on radar-k
		if (k > state.radar_k) {
			// have to update location search
			await StationService.update_location(pos, k, 0)
		}
		var info = state.info_dialog as StationDialogProps | PosDialogProps
		info.props.radar_list = makeRadarList(pos, k)
		dispatch({
			type: ActionType.SHOW_STATION_ITEM,
			payload: info
		})
	}
}

export function setRadarK(value: number) {
	store.dispatch((dispatch: Dispatch<GlobalAction>, getState: () => GlobalState) => {
		var state = getState()
		checkRadarK(value, dispatch, state).then(() => {
			dispatch({
				type: ActionType.SET_RADER_K,
				payload: {
					k: value
				}
			})
		})
	})
}

export function setWatchCurrentPosition(value: boolean) {
	store.dispatch({
		type: ActionType.WATCH_CURRENT_POSITION,
		payload: {
			watch: value
		}
	});
	StationService.watch_current_position(value)
}

export function setCurrentPosition(pos: GeolocationPosition) {
	store.dispatch({
		type: ActionType.SET_CURRENT_POSITION,
		payload: {
			pos: pos
		}
	});
}

export function setPositionAccuracy(high: boolean) {
	store.dispatch({
		type: ActionType.SET_GPS_ACCURACY,
		payload: {
			high: high
		}
	});
	StationService.set_position_accuracy(high)
}

export function requestShowPosition(pos: LatLng) {
	store.dispatch((dispatch: Dispatch<GlobalAction>, getState: () => GlobalState) => {
		var state = getState()
		StationService.update_location(pos, state.radar_k, 0).then(station => {
			dispatch({
				type: ActionType.SHOW_STATION_ITEM,
				payload: {
					type: DialogType.Position,
					props: {
						station: station,
						radar_list: makeRadarList(pos, state.radar_k),
						prefecture: StationService.get_prefecture(station.prefecture),
						location: {
							pos: pos,
							dist: StationService.measure(station.position, pos)
						}
					}
				}
			})
		})
	})
}

export function requestShowStation(s: Station) {
	// use middleware because value of state is needed
	store.dispatch((dispatch: Dispatch<GlobalAction>, getState: () => GlobalState) => {
		var state = getState()
		StationService.update_location(s.position, state.radar_k, 0).then(() => {

			dispatch({
				type: ActionType.SHOW_STATION_ITEM,
				payload: {
					type: DialogType.Station,
					props: {
						station: s,
						radar_list: makeRadarList(s.position, state.radar_k),
						prefecture: StationService.get_prefecture(s.prefecture),
						lines: s.lines.map(code => StationService.get_line(code))
					}
				}
			})
		})
	})
}

export function requestShowLine(line: Line) {
	store.dispatch({
		type: ActionType.SHOW_STATION_ITEM,
		payload: {
			type: DialogType.Line,
			props: {
				line: line,
				line_details: line.has_details
			}
		}
	})
	// if needed, load details of the item and update it.
	if (!line.has_details) {
		StationService.get_line_detail(line.code).then(l => {
			requestShowLine(l)
		});
	}
}

export function requestShowStationItem(item: StationSuggestion) {
	switch (item.type) {
		case "station": {
			StationService.get_station(item.code).then(s => {
				requestShowStation(s)
			})
			break

		}
		case "line": {
			var line = StationService.get_line(item.code)
			requestShowLine(line)
		}
	}
}


export function setMapTransition(current: MapTransition) {
	store.dispatch({
		type: ActionType.SET_TRANSITION,
		payload: {
			current: current
		}
	})
}

function makeRadarList(pos: LatLng, k: number): Array<RadarStation> {
	if (!StationService.tree) throw Error("Kd-tree not initialized yet")
	return StationService.tree.getNearStations(k).map(s => {
		return {
			station: s,
			dist: StationService.measure(s.position, pos),
			lines: s.lines.map(code => StationService.get_line(code).name).join(' '),
		}
	})
}
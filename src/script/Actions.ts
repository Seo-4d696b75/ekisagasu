import { store } from "./Store"
import { ActionType, GlobalAction, GlobalState } from "./Reducer"
import { StationSuggestion } from "../components/StationSearchBox"
import { Station } from "./Station";
import { Line } from "./Line";
import StationService from "./StationService";
import { Dispatch } from "redux";
import { LatLng } from "./Utils";
import { RadarStation, StationDialogProps, NavType, NavState, StationDialogNav, DialogType } from "../components/Map";


async function checkRadarK(k: number, dispatch: Dispatch<GlobalAction>, state: GlobalState) {
	const checker = async (pos: LatLng, nav: StationDialogNav) => {
		// have to update rakar list, which depneds on radar-k
		if (k > state.radar_k) {
			// have to update location search
			await StationService.update_location(pos, k, 0)
		}
		nav.data.dialog.props.radar_list = makeRadarList(pos, k)
		dispatch({
			type: ActionType.SHOW_STATION_ITEM,
			payload: nav
		})
	}
	switch (state.nav.type) {
		case NavType.DIALOG_STATION_POS: {
			checker(state.nav.data.dialog.props.station.position, state.nav)
			break
		}
		case NavType.DIALOG_SELECT_POS: {
			checker(state.nav.data.dialog.props.position, state.nav)
			break
		}
		default:
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
					type: NavType.DIALOG_SELECT_POS,
					data: {
						dialog: {
							type: DialogType.SELECT_POSITION,
							props: {
								station: station,
								radar_list: makeRadarList(pos, state.radar_k),
								prefecture: StationService.get_prefecture(station.prefecture),
								position: pos,
								dist: StationService.measure(station.position, pos),
								lines: station.lines.map(code => StationService.get_line(code)),
							}
						},
						show_high_voronoi: false,
					}
				}
			})
		})
	})
}

export function requestShowStation(s: Station): Promise<void> {
	return new Promise((resolve, reject) => {
		// use middleware because value of state is needed
		store.dispatch((dispatch: Dispatch<GlobalAction>, getState: () => GlobalState) => {
			var state = getState()
			StationService.update_location(s.position, state.radar_k, 0).then(() => {

				dispatch({
					type: ActionType.SHOW_STATION_ITEM,
					payload: {
						type: NavType.DIALOG_STATION_POS,
						data: {
							dialog: {
								type: DialogType.STATION,
								props: {
									station: s,
									radar_list: makeRadarList(s.position, state.radar_k),
									prefecture: StationService.get_prefecture(s.prefecture),
									lines: s.lines.map(code => StationService.get_line(code)),
								}
							},
							show_high_voronoi: false,
						}
					}
				})
				resolve()
			}).catch(e => reject(e))
		})
	})
}

export function requestShowLine(line: Line): Promise<Line> {
	store.dispatch({
		type: ActionType.SHOW_STATION_ITEM,
		payload: {
			type: NavType.DIALOG_LINE,
			data: {
				dialog: {
					type: DialogType.LINE,
					props: {
						line: line,
						line_details: line.has_details,
					}
				},
				polyline_list: [],
				stations_marker: [],
				show_polyline: false,
			}
		}
	})
	// if needed, load details of the item and update it.
	if (!line.has_details) {
		return StationService.get_line_detail(line.code).then(l => {
			requestShowLine(l)
			return l
		});
	} else {
		return Promise.resolve(line)
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

export function setNavStateIdle() {
	setNavState({
		type: NavType.IDLE,
		data: null
	})
}

export function setNavState(state: NavState) {
	store.dispatch({
		type: ActionType.SET_NAV_STATE,
		payload: {
			current: state
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

export function onStationLoaded(list: Array<Station>) {
	store.dispatch({
		type: ActionType.LOAD_STATIONS,
		payload: {
			stations: list,
		}
	})
}

export function setShowStationPin(show: boolean) {
	store.dispatch({
		type: ActionType.SHOW_STATION_PIN,
		payload: {
			show: show
		}
	})
}
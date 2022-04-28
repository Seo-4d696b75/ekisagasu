import { store } from "./Store"
import { ActionType, GlobalAction, GlobalState } from "./Reducer"
import { StationSuggestion } from "../components/StationSearchBox"
import { Station } from "./Station";
import { Line } from "./Line";
import StationService from "./StationService";
import { Dispatch } from "redux";
import { LatLng, PolylineProps } from "./Utils";
import { RadarStation, NavType, StationDialogNav, DialogType, LineDialogProps } from "../components/MapNavState";
import { ThunkDispatch } from "redux-thunk";


async function checkRadarK(k: number, dispatch: Dispatch<GlobalAction>, state: GlobalState) {
	const checker = async (pos: LatLng): Promise<Array<RadarStation>> => {
		// have to update rakar list, which depneds on radar-k
		if (k > state.radar_k) {
			// have to update location search
			await StationService.update_location(pos, k, 0)
		}
		return makeRadarList(pos, k)
	}
	switch (state.nav.type) {
		case NavType.DIALOG_STATION_POS: {
			var list = await checker(state.nav.data.dialog.props.station.position)
			state.nav.data.dialog.props.radar_list = list
			dispatch({
				type: ActionType.SET_NAV_STATE,
				payload: {
					next: state.nav
				}
			})
			break
		}
		case NavType.DIALOG_SELECT_POS: {
			list = await checker(state.nav.data.dialog.props.position)
			state.nav.data.dialog.props.radar_list = list
			dispatch({
				type: ActionType.SET_NAV_STATE,
				payload: {
					next: state.nav
				}
			})
			break
		}
		case NavType.IDLE: {
			if (state.watch_position && state.current_location) {
				var pos = {
					lat: state.current_location.position.lat(),
					lng: state.current_location.position.lng()
				}
				list = await checker(pos)
				updateNavStateIdle(pos, list, dispatch)
			}
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
  store.dispatch((dispatch, getState) => {
    let state = getState()
    const coords = pos.coords
    const loc = {
      position: new google.maps.LatLng(coords.latitude, coords.longitude),
      accuracy: coords.accuracy,
      heading: coords.heading
    }
    const previous = state.current_location?.position
    dispatch({
		type: ActionType.SET_CURRENT_POSITION,
		payload: {
        loc: loc,
        event: previous && loc.position.equals(previous) ? state.current_location_update : createEvent(loc.position)
		}
	});
  })
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
			if (!station) return
			dispatch({
				type: ActionType.SET_NAV_STATE,
				payload: {
					next: {
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
						},
					},
					focus: pos
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
					type: ActionType.SET_NAV_STATE,
					payload: {
						next: {
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
						},
						focus: s.position
					}
				})
				resolve()
			}).catch(e => reject(e))
		})
	})
}

export async function requestShowLine(line: Line): Promise<Line> {
	store.dispatch({
		type: ActionType.SET_NAV_STATE,
		payload: {
			next: {
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
		}
	})
	// if needed, load details of the item and update it.
	if (!line.has_details) {
		const l = await StationService.get_line_detail(line.code);
		requestShowLine(l);
		return l;
	} else {
		return Promise.resolve(line)
	}
}

export function showPolyline(dialog: LineDialogProps, polylines: Array<PolylineProps>, stations: Array<LatLng>) {
	store.dispatch({
		type: ActionType.SET_NAV_STATE,
		payload: {
			next: {
				type: NavType.DIALOG_LINE,
				data: {
					dialog: dialog,
					show_polyline: true,
					polyline_list: polylines,
					stations_marker: stations
				}
			}
		}
	})
}

export function showHighVoronoi(nav: StationDialogNav) {
	var next = { ...nav }
	next.data.show_high_voronoi = true
	store.dispatch({
		type: ActionType.SET_NAV_STATE,
		payload: {
			next: next
		}
	})
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

function updateNavStateIdle(pos: LatLng, list: Array<RadarStation>, dispatch: ThunkDispatch<GlobalState,undefined,GlobalAction>) {
	const station = list[0].station
	dispatch({
		type: ActionType.SET_NAV_STATE,
		payload: {
			next: {
				type: NavType.IDLE,
				data: {
					dialog: {
						type: DialogType.CURRENT_POSITION,
						props: {
							station: station,
							radar_list: list,
							prefecture: StationService.get_prefecture(station.prefecture),
							position: pos,
							dist: StationService.measure(station.position, pos),
							lines: station.lines.map(code => StationService.get_line(code)),
						}
					},
				},
			}
		}
	})
}

export function setNavStateIdle() {
	store.dispatch((dispatch, getState) => {
		const state = getState()
		const location = state.current_location
		if (state.watch_position && location) {
			const pos = { lat: location.position.lat(), lng: location.position.lng() }
			StationService.update_location(pos, state.radar_k).then(station => {
				if (!station) return
				updateNavStateIdle(pos, makeRadarList(pos, state.radar_k), dispatch)
			})
		} else {
			dispatch({
				type: ActionType.SET_NAV_STATE,
				payload: {
					next: {
						type: NavType.IDLE,
						data: {
							dialog: null
						}
					}
				}
			})
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
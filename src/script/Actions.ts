import store from "./Store"
import {ActionType, GlobalAction, GlobalState} from "./Reducer"
import {StationSuggestion} from "../components/StationSearchBox"
import { Station } from "./Station";
import { Line } from "./Line";
import StationService  from "./StationService";
import { Action, Dispatch } from "redux";
import { LatLng } from "./Utils";

async function checkRadarK(r: number, state: GlobalState) {
	if ( state.show_request && state.radar_k < r ){
		switch(state.show_request.type){
			case 'station': {
				await StationService.update_location(state.show_request.station.position, r, 0)
				break
			}
			case 'position': {
				await StationService.update_location(state.show_request.pos, r, 0)
				break
			}
			default:
		}
	}
}

export function setRadarK(value: number){
	var update = (dispatch: Dispatch<GlobalAction>, getState: () => GlobalState) => {
		var state = getState()
		checkRadarK(value, state).then( () => {
			dispatch({
				type: ActionType.SET_RADER_K,
				payload: {
					k: value
				}
			})
		})
	}
	store.dispatch(update)
}

export function setWatchCurrentPosition(value: boolean){
	store.dispatch({
		type: ActionType.WATCH_CURRENT_POSITION,
		payload: {
			watch: value
		}
	});
	StationService.watch_current_position(value)
}

export function setCurrentPosition(pos: GeolocationPosition){
	store.dispatch({
		type: ActionType.SET_CURRENT_POSITION,
		payload: {
			pos: pos
		}
	});
}

export function setPositionAccuracy(high: boolean){
	store.dispatch({
		type: ActionType.SET_GPS_ACCURACY,
		payload: {
			high: high
		}
	});
	StationService.set_position_accuracy(high)
}

function requestShowStation(s: Station) {
	store.dispatch({
		type: ActionType.SHOW_STATION_ITEM,
		payload: {
			type: "station",
			station: s
		}
	});
}

function requestShowLine(line: Line) {
	store.dispatch({
		type: ActionType.SHOW_STATION_ITEM,
		payload: {
			type: "line",
			line: line
		}
	});
	if ( !line.has_details ){
		StationService.get_line_detail(line.code).then( l => {
			requestShowLine(l)
		});
	}
}

export function requestShowStationItem(item: StationSuggestion | Station | Line){
	if ( item instanceof Station ){
		requestShowStation(item)
	} else if ( item instanceof Line ){
		requestShowLine(item)
	} else {
		switch(item.type){
			case "station": {
				StationService.get_station(item.code).then( s => {
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
}
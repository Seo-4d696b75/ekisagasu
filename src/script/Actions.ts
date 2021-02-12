import store from "./Store"
import {StationSuggestion} from "../components/StationSearchBox"
import { Station } from "./Station";
import { Line } from "./Line";
import StationService  from "./StationService";

export function setRadarK(value: number){
	store.radar_k.value = value
}

export function setWatchCurrentPosition(value: boolean){
	store.watch_position.value = value
}

export function setCurrentPosition(pos: GeolocationPosition){
	store.current_position.value = pos
}

export function setPositionAccuracy(high: boolean){
	store.high_accuracy.value = high
}

export function requestShowStationItem(item: StationSuggestion | Station | Line){
	if ( item instanceof Station ){
		store.show_request.value = item
	} else if ( item instanceof Line ){
		store.show_request.value = item
	} else {
		switch(item.type){
			case "station": {
				StationService.get_station(item.code).then( s => {
					store.show_request.value = s
				})
				break

			}
			case "line": {
				var line = StationService.get_line(item.code)
				store.show_request.value = line
			}
		}
	}
}
import dispatcher from "./Dispatcher";

export function setRadarK(value){
	dispatcher.dispatch({
		type: "radar-k",
		value: value,
	});
}

export function setWatchCurrentPosition(value){
	dispatcher.dispatch({
		type: "watch_position",
		value: value,
	});
}

export function setCurrentPosition(pos){
	dispatcher.dispatch({
		type: "current_position",
		value: pos,
	});
}

export function setPositionAccuracy(high){
	dispatcher.dispatch({
		type: "high_accuracy",
		value: high,
	});
}

export function requestShowStationItem(item){
	dispatcher.dispatch({
		type: "show_station",
		value: item,
	});
}
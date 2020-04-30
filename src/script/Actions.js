import dispatcher from "./Dispatcher";

export function setRadarK(value){
	dispatcher.dispatch({
		type: "radar-k",
		value: value,
	});
}
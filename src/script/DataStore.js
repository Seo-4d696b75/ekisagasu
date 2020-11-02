import { EventEmitter } from "events";
import dispatcher from "./Dispatcher";


class DataStore extends EventEmitter {
	constructor(){
		super();
		// initial value
		this.data = {
			radar_k: 18,
			watch_position: false,
			current_position: null,
			high_accuracy: false,
		};
	}

	getData(){
		return this.data;
	}

	handleActions(action){
		//console.log("DataStore recived an action", action);
		switch(action.type){
			case "radar-k": {
				if ( action.value < 1 ) action.value = 1;
				if ( action.value > 20 ) action.value = 20;
				if ( action.value !== this.data.radar_k ){
					this.data.radar_k = action.value;
					this.emit("onRadarKChanged", this.data.radar_k);
				}
				break;
			}
			case "watch_position": {
				var bool = !!action.value;
				if ( this.data.watch_position !== bool ){
					this.data.watch_position = bool;
					this.emit("onWatchPositionChanged", bool);
				}
				break;
			}
			case "current_position": {
				if ( this.data.current_position !== action.value ){
					this.data.current_position = action.value;
					this.emit("onCurrentPositionChanged", action.value);
				}
				break;
			}
			case "high_accuracy": {
				bool = !!action.value;
				if ( this.data.high_accuracy !== bool ){
					this.data.high_accuracy = bool;
					this.emit("onPositionAccuracyChanged", bool);
				}
				break;
			}
			case "show_station": {
				this.emit("onShowStationItemRequested", action.value);
				break;
			}
			default: {
				console.log("unknown action type.", action.type);
			}
		}
	}

}

const dataStore = new DataStore();
dispatcher.register(dataStore.handleActions.bind(dataStore));

export default dataStore;
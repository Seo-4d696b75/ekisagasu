import { EventEmitter } from "events";
import dispatcher from "./Dispatcher";


class DataStore extends EventEmitter {
	constructor(){
		super();
		this.data = {
			radar_k: 18
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
					this.emit("onRadarKChanged");
				}
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
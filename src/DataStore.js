import { EventEmitter } from "events";
import dispatcher from "./Dispatcher";
import {ACTION} from "./Actions";

export var EVENT = {
	HEADER_TEXT_CHANGED: "onHeaderTextChanged",
	MAP_BOUNDS_CHANGED: "onMapBoundsChanged",
	INFO_DIALOG_CHANGED: "onInfoDialogChanged",
};


class DataStore extends EventEmitter {
	constructor(){
		super();
		this.data = {
			header_text: {
				value: "hoge",
				fetching: false
			},
			map: {
				bounds: {
					north: null,
					south: null,
					west: null,
					east: null
				},
				info_dialog: {
					visible: false,
					type: null,
					data: null
				}
			},
		};
	}

	getData(){
		return this.data;
	}

	handleActions(action){
		//console.log("DataStore recived an action", action);
		switch(action.type){
			case ACTION.CHANGE_HEADER_TEXT: {
				if ( this.data.header_text.fetching ){
					console.log("fetching.");
					break;
				}
				this.data.header_text.value = action.text;
				this.emit(EVENT.HEADER_TEXT_CHANGED);
				break;
			}
			case ACTION.FETCH_HEADER_TEXT: {
				this.data.header_text.fetching = action.state;
				break;
			}
			case ACTION.CHANGE_MAP_BOUNDS: {
				this.data.map.bounds = action.bounds;
				this.emit(EVENT.MAP_BOUNDS_CHANGED);
				break;
			}
			case ACTION.SHOW_INFO_DIALOG: {
				this.data.map.info_dialog = {
					visible: true,
					type: action.data_type,
					data: action.data,
				};
				this.emit(EVENT.INFO_DIALOG_CHANGED);
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
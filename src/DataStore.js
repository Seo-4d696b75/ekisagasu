import { EventEmitter } from "events";
import dispatcher from "./Dispatcher";
import {ACTION} from "./Actions";

export var EVENT = {
	HEADER_TEXT_CHANGED: "onHeaderTextChanged"
};


class DataStore extends EventEmitter {
	constructor(){
		super();
		this.data = {
			header_text: {
				value: "hoge",
				fetching: false
			}
		};
	}

	getData(){
		return this.data;
	}

	handleActions(action){
		console.log("DataStore recived an action", action);
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
			default: {
				console.log("unknown action type.", action.type);
			}
		}
	}

}

const dataStore = new DataStore();
dispatcher.register(dataStore.handleActions.bind(dataStore));
window.dispatcher = dispatcher;

export default dataStore;
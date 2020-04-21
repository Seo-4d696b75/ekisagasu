import dispatcher from "./Dispatcher";
import DataStore from "./DataStore";

export var ACTION =  {
	CHANGE_HEADER_TEXT: "setHeaderText",
	FETCH_HEADER_TEXT: "setHeaderTextFetchState",
	CHANGE_MAP_BOUNDS: "setMapBounds",
	SHOW_INFO_DIALOG: "showInfoDialog",
	CLOSE_INFO_DIALOG: "closeInfoDialog",
};


export function setHeaderText(text){
	dispatcher.dispatch({
		type: ACTION.CHANGE_HEADER_TEXT,
		text: text
	});
}

function setHeaderTextFetchState(state){
	dispatcher.dispatch({
		type: ACTION.FETCH_HEADER_TEXT,
		state: state
	});
}

export function setMapBounds(bounds){
	dispatcher.dispatch({
		type: ACTION.CHANGE_MAP_BOUNDS,
		bounds: {
			south: bounds.Ya.g,
			north: bounds.Ya.i,
			west: bounds.Ta.g,
			east: bounds.Ta.i
		}
	})
}

export function setHeaderTextSync(){
  if ( DataStore.getData().header_text.fetching ){
		console.log("now fetching.");
		return;
	}
	setHeaderText("fetching...");
	setHeaderTextFetchState(true);
	setTimeout(() => {
		setHeaderTextFetchState(false);
		setHeaderText("Header Text Fetched!");
	}, 3000);
}

export function showInfoDialog(type,data){
	dispatcher.dispatch({
		type: ACTION.SHOW_INFO_DIALOG,
		data_type: type,
		data: data,
	});
}

export function closeInfoDialog(){
	dispatcher.dispatch({
		type: ACTION.CLOSE_INFO_DIALOG
	})
}
import dispatcher from "./Dispatcher";
import DataStore from "./DataStore";

export var ACTION =  {
	CHANGE_HEADER_TEXT: "setHeaderText",
	FETCH_HEADER_TEXT: "setHeaderTextFetchState"
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
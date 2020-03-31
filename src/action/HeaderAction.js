import axios from "axios";

export function setHeaderText(text){
	return {
		type: "SET_HEADER_TEXT",
		payload: {
			text: text
		}
	}
}

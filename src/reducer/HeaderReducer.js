export default function reducer(state={text:"hoge"},action){
	switch(action.type){
		case "STE_HEADER_TEXT": {
			return {...state, text: action.payload.text};
		}
		default: {
			return state;
		}
	}
}
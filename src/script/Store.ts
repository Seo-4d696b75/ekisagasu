import {createStore, Store, Unsubscribe, Action, applyMiddleware} from "redux"
import reducer, { GlobalAction, GlobalState } from "./Reducer"
import thunk, {ThunkMiddleware } from "redux-thunk"
import liveData from  "./LiveData"
import { Station } from "./Station"
import { Line } from "./Line"

//const store = createStore(reducer, applyMiddleware(thunk as ThunkMiddleware<GlobalState,GlobalAction,undefined>))
export const store = createStore(reducer)


export const events = {
  show_request: liveData<Station|Line>()
}

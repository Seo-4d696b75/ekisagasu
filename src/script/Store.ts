import {createStore, applyMiddleware} from "redux"
import reducer, { GlobalAction, GlobalState } from "./Reducer"
import thunk, {ThunkMiddleware } from "redux-thunk"

export const store = createStore(reducer, applyMiddleware(thunk as ThunkMiddleware<GlobalState,GlobalAction,undefined>))

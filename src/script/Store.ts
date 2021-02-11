import {createStore, Store, Unsubscribe, Action, applyMiddleware} from "redux"
import reducer, { GlobalAction, GlobalState } from "./Reducer"
import thunk, {ThunkMiddleware } from "redux-thunk"

const store = createStore(reducer, applyMiddleware(thunk as ThunkMiddleware<GlobalState,GlobalAction,undefined>))

type Selector<State,Value> = (state: State) => Value
type Observer<Value> = (value: Value) => any
interface EventData<Data> {
  value: Data
  version: number
}

class StoreAdapter<TState,TAction extends Action> {

  store: Store<TState, TAction>

  constructor(store: Store<TState, TAction>){
    this.store = store
  }

  dispatch(action: TAction): TAction{
    return this.store.dispatch(action)
  }

  getState(): TState {
    return this.store.getState()
  }

  observeState(observer: Observer<TState>): Unsubscribe{
    return this.store.subscribe(() => {
      observer(this.store.getState())
    })
  }

  observeValue<Value>(selector: Selector<TState,Value>, observer: Observer<Value>): Unsubscribe{
    var value = selector(this.store.getState())
    observer(value)
    return this.store.subscribe(() => {
      var v = selector(this.store.getState())
      if ( v !== value ){
        value = v
        observer(v)
      }
    })
  }

}

export default store
//export default new StoreAdapter(store)
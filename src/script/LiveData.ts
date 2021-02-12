
enum ValueState {
  NOT_INIT,
  INITIALIZED,
}

type Value<E> = ValidValue<E> | NoValue

interface ValidValue<E> {
  state: ValueState.INITIALIZED
  value: E
}

interface NoValue {
  state: ValueState.NOT_INIT
}

export type Observer<E> = (value: E) => any
export type Unregister = () => void

enum ObserveType {
  OBSERVE_CHANGE,
  LISTEN_EMIT,
}

interface Callback<E> {
  observer: Observer<E>
  type: ObserveType
  id: number
}

export class LiveData<E> {

  constructor(initValue: E | ValueState.NOT_INIT = ValueState.NOT_INIT) {
    if (initValue === ValueState.NOT_INIT) {
      this._value = { state: ValueState.NOT_INIT }
    } else {
      this._value = {
        state: ValueState.INITIALIZED,
        value: initValue
      }
    }
  }

  _value: Value<E>
  _callbackes: Array<Callback<E>> = []
  _callback_id: number = 0

  observe(observer: Observer<E>, skipCurrentValue: boolean = false): Unregister {
    if (!skipCurrentValue && this._value.state === ValueState.INITIALIZED) {
      observer(this._value.value)
    }
    const id = this._callback_id++
    this._callbackes.push({
      id: id,
      observer: observer,
      type: ObserveType.OBSERVE_CHANGE
    })
    return () => {
      this._callbackes = this._callbackes.filter(c => c.id !== id)
    }
  }

  listen(observer: Observer<E>): Unregister {
    const id = this._callback_id++
    this._callbackes.push({
      id: id,
      observer: observer,
      type: ObserveType.LISTEN_EMIT
    })
    return () => {
      this._callbackes = this._callbackes.filter(c => c.id !== id)
    }
  }

  set value(v: E) {
    if (this._value.state === ValueState.NOT_INIT) {
      this._value = {
        state: ValueState.INITIALIZED,
        value: v
      }
      this._callbackes.forEach(c => c.observer(v))
    } else {
      var old = this._value.value
      this._value = {
        ...this._value,
        value: v
      }
      this._callbackes
        .filter(c => c.type === ObserveType.LISTEN_EMIT)
        .forEach(c => c.observer(v))
      if ( v !== old ){
        this._callbackes
          .filter(c => c.type === ObserveType.OBSERVE_CHANGE)
          .forEach(c => c.observer(v))
      }
    }
  }

  get(defaultValue: E): E {
    if ( this._value.state === ValueState.INITIALIZED ){
      return this._value.value
    } else {
      return defaultValue
    }
  }

  read(): E | undefined {
    if ( this._value.state === ValueState.INITIALIZED ){
      return this._value.value
    } else {
      return undefined
    }
  }
}

export function liveData<E>(initValue?: E) {
  return new LiveData(initValue)
}

export default liveData


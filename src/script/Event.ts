
export type Observer<T> = (value: T) => void

enum EventState {
  Idle,
  Active,
}

type IdleEvent = {
  state: EventState.Idle
}

type ActiveEvent<T> = {
  state: EventState.Active,
  value: T
}

type EventValue<T> = IdleEvent | ActiveEvent<T>

export class PropsEvent<T> {

  constructor(value: EventValue<T>){
    this.value = value
  }

  value: EventValue<T>
  history = new Set<string>()

  observe(key: string, observer: Observer<T>){
    if ( this.value.state === EventState.Active && !this.history.has(key) ){
      this.history.add(key)
      observer(this.value.value)
    }
  }

}

export function createIdleEvent<T>(): PropsEvent<T>{
  return new PropsEvent({state: EventState.Idle})
}

export function createEvent<T>(value: T): PropsEvent<T>{
  return new PropsEvent({
    state: EventState.Active,
    value: value,
  })
}
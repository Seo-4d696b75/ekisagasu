
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

export type PropsEvent<T> =
  IdleEvent | ActiveEvent<T>

export function handleIf<T>(event: PropsEvent<T>, handler: (value: T) => void) {
  if (event.state === EventState.Active) {
    handler(event.value)
  }
}

export function createIdleEvent<T>(): PropsEvent<T> {
  return { state: EventState.Idle }
}

export function createEvent<T>(value: T): PropsEvent<T> {
  return {
    state: EventState.Active,
    value: value,
  }
}
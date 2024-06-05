

export interface AsyncIteratorSubject<T> extends AsyncIterable<T> {
  resolve: (value: T, complete?: boolean) => void
  reject: (error?: any) => void
  complete: () => void
  readonly completed: boolean
}

class AsyncIteratorSubjectImpl<T> implements AsyncIteratorSubject<T> {
  callbackQueue: {
    resolve: (result: IteratorResult<T>) => void
    reject: (error?: any) => void
  }[]
  promiseQueue: Promise<IteratorResult<T>>[]

  completed: boolean = false
  hasIteratorReturned: boolean = false

  constructor() {
    this.callbackQueue = []
    this.promiseQueue = []
  }

  checkQueue() {
    if (this.callbackQueue.length === 0 || this.promiseQueue.length === 0) {
      const promise = new Promise<IteratorResult<T>>((resolve, reject) => {
        this.callbackQueue.push({
          resolve: resolve,
          reject: reject,
        })
      })
      this.promiseQueue.push(promise)
    }
  }

  resolve(value: T, complete?: boolean) {
    if (this.completed) {
      return
    }
    this.checkQueue()
    const callback = this.callbackQueue.shift()!!
    callback.resolve({ value: value })
    if (complete === true) {
      this.complete()
    }
  }

  complete() {
    if (this.completed) {
      return
    }
    this.completed = true
    this.checkQueue()
    const callback = this.callbackQueue.shift()!!
    callback.resolve({
      done: true,
      value: undefined,
    })
  }

  reject(error?: any) {
    if (this.completed) {
      return
    }
    this.checkQueue()
    const callback = this.callbackQueue.shift()!!
    callback.reject(error)
    this.completed = true
  }

  [Symbol.asyncIterator]() {
    if (this.hasIteratorReturned) {
      throw Error('multiple subscribers not supported')
    }
    this.hasIteratorReturned = true
    return {
      next: () => {
        this.checkQueue()
        return this.promiseQueue.shift()!!
      }
    }
  }
}

export function asyncIteratorSubject<T>(): AsyncIteratorSubject<T> {
  return new AsyncIteratorSubjectImpl<T>()
}
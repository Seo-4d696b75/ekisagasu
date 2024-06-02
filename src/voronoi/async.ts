

export interface AsyncIteratorSubject<T> extends AsyncIterable<T> {
  resolve: (value: T, done?: boolean) => void
  reject: (error?: any) => void
  readonly done: boolean
}

class AsyncGeneratorSubjectImpl<T> implements AsyncIteratorSubject<T> {
  callbackQueue: {
    resolve: (value: T) => void
    reject: (error?: any) => void
  }[]
  promiseQueue: Promise<T>[]

  done: boolean = false

  constructor() {
    this.callbackQueue = []
    this.promiseQueue = []
  }

  checkQueue() {
    if (this.callbackQueue.length === 0 || this.promiseQueue.length === 0) {
      const promise = new Promise<T>((resolve, reject) => {
        this.callbackQueue.push({
          resolve: resolve,
          reject: reject,
        })
      })
      this.promiseQueue.push(promise)
    }
  }

  resolve(value: T, done?: boolean) {
    if (this.done) {
      return
    }
    this.checkQueue()
    const callback = this.callbackQueue.shift()!!
    callback.resolve(value)
    this.done = (done === true)
  }

  reject(error?: any) {
    if (this.done) {
      return
    }
    this.checkQueue()
    const callback = this.callbackQueue.shift()!!
    callback.reject(error)
    this.done = true
  }

  [Symbol.asyncIterator]() {
    const isDone = () => this.done
    const getPromise = () => {
      this.checkQueue()
      return this.promiseQueue.shift()!!
    }
    return async function* () {
      while (isDone() === false) {
        const value = await getPromise()
        yield value
      }
    }()
  }
}

export function createAsyncIteratorSubject<T>(): AsyncIteratorSubject<T> {
  return new AsyncGeneratorSubjectImpl<T>()
}
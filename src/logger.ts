
interface Logger {
  d: (message: any, ...params: any[]) => void
  i: (message: any, ...params: any[]) => void
  w: (message: any, ...params: any[]) => void
  e: (message: any, ...params: any[]) => void
}

class DebugLogger implements Logger {
  d(message: any, ...params: any[]) {
    console.log(message, ...params)
  }
  i(message: any, ...params: any[]) {
    console.info(message, ...params)
  }
  w(message: any, ...params: any[]) {
    console.warn(message, ...params)
  }
  e(message: any, ...params: any[]) {
    console.error(message, ...params)
  }
}

class ProdLogger implements Logger {
  d(message: any, ...params: any[]) { }
  i(message: any, ...params: any[]) {
    console.info(message, ...params)
  }
  w(message: any, ...params: any[]) {
    console.warn(message, ...params)
  }
  e(message: any, ...params: any[]) {
    console.error(message, ...params)
  }
}

export const logger: Logger = process.env.NODE_ENV === 'development'
  ? new DebugLogger()
  : new ProdLogger()

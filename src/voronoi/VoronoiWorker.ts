import { Point } from "../diagram/types"
import { Voronoi } from "../diagram/voronoi"

const ctx: Worker = self as any  /* eslint-disable-line no-restricted-globals */

interface StationPoint extends Point {
  code: number
}

interface WorkerState {
  voronoi: Voronoi<StationPoint> | null
  promise: Map<number, ((p: (StationPoint)[]) => void)>
}

const state: WorkerState = {
  voronoi: null,
  promise: new Map(),
}

// Workerで実行するため callback スタイルに変換する
ctx.addEventListener('message', message => {
  const data = JSON.parse(message.data)
  if (data.type === 'start') {
    const container = data.container
    const provider = (point: StationPoint) => {
      return new Promise<(StationPoint)[]>((resolve, reject) => {
        state.promise.set(point.code, resolve)
        ctx.postMessage(JSON.stringify({
          type: 'points',
          code: point.code,
        }))
      })
    }
    const progress = (index: number, polygon: Point[]) => {
      ctx.postMessage(JSON.stringify({
        type: 'progress',
        index: index,
        polygon: polygon.map(point => {
          return { lat: point.y, lng: point.x }
        })
      }))
    }
    state.voronoi = new Voronoi<StationPoint>(data.center, container, provider)
    state.voronoi.execute(data.k, progress).catch(e => {
      ctx.postMessage(JSON.stringify({
        type: 'error',
        err: e.message
      }))
    })


  } else if (data.type === 'points') {
    const resolve = state.promise.get(data.code)
    if (resolve) {
      state.promise.delete(data.code)
      resolve(data.points)
    } else {
      throw new Error(`no promise code:${data.code}`)
    }
  }
})
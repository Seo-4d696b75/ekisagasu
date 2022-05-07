import { Voronoi } from "../diagram/voronoi"
import { Point } from "../diagram/types"
import { Station } from "./station"

const ctx: Worker = self as any  /* eslint-disable-line no-restricted-globals */

interface WorkerState {
  voronoi: Voronoi<Station & Point> | null
  promise: Map<number, ((p: (Station & Point)[]) => void)>
}

const state: WorkerState = {
  voronoi: null,
  promise: new Map(),
}

ctx.addEventListener('message', message => {
  const data = JSON.parse(message.data)
  if (data.type === 'start') {
    const container = data.container
    const provider = (point: Station & Point) => {
      return new Promise<(Station & Point)[]>((resolve, reject) => {
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
    state.voronoi = new Voronoi<Point & Station>(container, provider)
    state.voronoi.execute(data.k, data.center, progress).then(() => {
      ctx.postMessage(JSON.stringify({
        type: 'complete',
      }))
    }).catch(e => {
      console.log(e)
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
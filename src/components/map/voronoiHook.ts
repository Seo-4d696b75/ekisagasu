import { useRef, useState } from "react";
import VoronoiWorker from "worker-loader!./../../script/VoronoiWorker"; // eslint-disable-line import/no-webpack-loader-syntax
import * as Rect from "../../diagram/Rect";
import { LatLng } from "../../script/location";
import { Station } from "../../script/Station";
import StationService from "../../script/StationService";

export interface HighVoronoiCallback {
  onStart?: (center: Station) => void
  onProgress?: (index: number, polygons: LatLng[][]) => void
  onComplete?: (center: Station, polygons: LatLng[][]) => void
  onError?: (err: any) => void
  onCancel?: () => void
}

/**
 * 高次ボロノイを計算するロジック
 * @param callback 計算中の各段階で呼ばれるコールバック関数
 * @returns 
 */
export const useHighVoronoi = (radarK: number, callback: HighVoronoiCallback) => {

  const [highVoronoi, setHighVoronoi] = useState<LatLng[][]>([])
  const [workerRunning, setWorkerRunning] = useState(false)

  const workerRef = useRef<Worker | null>(null)

  const run = (station: Station) => {
    if (workerRunning) {
      console.log("worker is running")
      return
    }
    const worker = new VoronoiWorker()
    // DO NOT refer to 'voronoi', which is always an empty list at time when the listener set to the worker.
    let list: LatLng[][] = []
    // register callback so that this process can listen message from worker
    worker.addEventListener("message", message => {
      const data = JSON.parse(message.data)
      if (data.type === 'points') {
        // point provide
        StationService.get_station(data.code).then(s => {
          return Promise.all(
            s.next.map(code => StationService.get_station(code))
          )
        }).then(stations => {
          var points = stations.map(s => {
            return {
              x: s.position.lng,
              y: s.position.lat,
              code: s.code
            }
          })
          worker.postMessage(JSON.stringify({
            type: 'points',
            code: data.code,
            points: points,
          }))
        })
      } else if (data.type === 'progress') {
        list = [
          ...list,
          data.polygon,
        ]
        setHighVoronoi(list)
        callback.onProgress?.(list.length - 1, list)
      } else if (data.type === 'complete') {
        worker.terminate()
        workerRef.current = null
        setWorkerRunning(false)
        callback.onComplete?.(station, list)
      } else if (data.type === "error") {
        console.error('fail to calc voronoi', data.err)
        worker.terminate()
        workerRef.current = null
        setWorkerRunning(false)
        callback.onError?.(data.err)
      }
    })

    workerRef.current = worker

    var boundary = Rect.init(127, 46, 146, 26)
    var container = Rect.getContainer(boundary)
    var center = {
      x: station.position.lng,
      y: station.position.lat,
      code: station.code,
    }
    setWorkerRunning(true)
    setHighVoronoi([])
    worker.postMessage(JSON.stringify({
      type: 'start',
      container: container,
      k: radarK,
      center: center,
    }))
    callback.onStart?.(station)
  }

  const cancel = () => {
    const worker = workerRef.current
    if (workerRunning && worker) {
      worker.terminate()
      workerRef.current = null
      setWorkerRunning(false)
      console.log("worker terminated")
    }
    callback.onCancel?.()
  }

  return {
    highVoronoi,
    workerRunning,
    run,
    cancel
  }
}
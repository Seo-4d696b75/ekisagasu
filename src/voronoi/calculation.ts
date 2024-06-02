import VoronoiWorker from "worker-loader!./VoronoiWorker"; // eslint-disable-line import/no-webpack-loader-syntax
import * as Rect from "../diagram/rect";
import { LatLng } from "../location/location";
import { logger } from "../logger";
import stationRepository from "../station/StationRepository";
import { Station } from "../station/station";
import { createAsyncIteratorSubject } from "./async";

export interface HighVoronoiCalculation extends AsyncIterable<LatLng[]> {
  cancel: () => void
}

export function calculateHightVoronoi(
  station: Station,
  k: number,
): HighVoronoiCalculation {
  const worker = new VoronoiWorker()

  const subject = createAsyncIteratorSubject<LatLng[]>()

  // Workerとの通信実装、 async-await スタイルに戻す
  worker.addEventListener("message", message => {
    const data = JSON.parse(message.data)
    if (data.type === 'points') {
      // point provide
      stationRepository.getStationPoint(data.code).then(s => {
        return Promise.all(
          s.next.map(code => stationRepository.getStationPoint(code))
        )
      }).then(stations => {
        const points = stations.map(s => {
          return {
            x: s.lng,
            y: s.lat,
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
      subject.resolve(
        data.polygon,
        data.index === k,
      )
    } else if (data.type === "error") {
      logger.w('fail to calc voronoi', data.err)
      worker.terminate()
      subject.reject(data.err)
    }
  })

  const boundary = Rect.init(127, 46, 146, 26)
  const container = Rect.getContainer(boundary)
  const center = {
    x: station.position.lng,
    y: station.position.lat,
    code: station.code,
  }

  // 計算開始
  worker.postMessage(JSON.stringify({
    type: 'start',
    container: container,
    k: k,
    center: center,
  }))

  const cancel = () => {
    if (!subject.done) {
      worker.terminate()
      subject.reject(new Error('high voronoi cancelled'))
    }
  }

  const calculation = Object.assign(subject, {
    cancel: cancel,
  })
  return calculation
}
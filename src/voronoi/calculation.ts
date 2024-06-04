import VoronoiWorker from "worker-loader!./VoronoiWorker"; // eslint-disable-line import/no-webpack-loader-syntax
import * as Rect from "../diagram/rect";
import { LatLng } from "../location";
import { logger } from "../logger";
import { Station } from "../station";
import stationRepository from "../station/repository";
import { asyncIteratorSubject } from "./async";


export class HightVoronoiCalculation {

  cancel: (() => void) | null = null

  calculate(
    station: Station,
    k: number,
  ): AsyncIterable<LatLng[]> {
    const worker = new VoronoiWorker()

    const subject = asyncIteratorSubject<LatLng[]>()

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

    this.cancel = () => {
      if (!subject.completed) {
        worker.terminate()
        subject.reject(new Error('high voronoi cancelled'))
      }
    }

    return subject
  }
}

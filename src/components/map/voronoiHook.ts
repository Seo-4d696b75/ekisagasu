import { useRef, useState } from "react";
import { LatLng } from "../../location/location";
import { Station } from "../../station/station";
import { HighVoronoiCalculation, calculateHightVoronoi } from "../../voronoi/calculation";



/**
 * 高次ボロノイの状態管理
 */
export const useHighVoronoi = (radarK: number) => {

  // TODO GlobalMapStateで管理する
  const [highVoronoi, setHighVoronoi] = useState<LatLng[][]>([])
  const [isRunning, setRunning] = useState(false)

  const ref = useRef<HighVoronoiCalculation | null>(null)

  const run = async (station: Station) => {
    if (isRunning) {
      throw Error('voronoi running already')
    }

    setRunning(true)
    setHighVoronoi([])

    const calculation = calculateHightVoronoi(station, radarK)
    ref.current = calculation

    try {
      let polygons: LatLng[][] = []
      for await (const polygon of calculation) {
        polygons = [
          ...polygons,
          polygon,
        ]
        setHighVoronoi(polygons)
      }
    } finally {
      setRunning(false)
    }
  }

  return {
    highVoronoi,
    run,
    cancel: () => ref.current?.cancel?.(),
  }
}
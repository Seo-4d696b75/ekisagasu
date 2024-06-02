import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { LatLng } from "../../location/location";
import { selectMapState } from "../../redux/selector";
import { Station } from "../../station/station";
import { HighVoronoiCalculation, calculateHightVoronoi } from "../../voronoi/calculation";
import { isStationDialog } from "../navState";



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

/**
 * 高次ボロノイの計算中に他状態に遷移した場合に計算をキャンセルする
 * @param cancel 
 */
export const useCancelHighVoronoiEffect = (
  cancel: () => void,
) => {
  const { nav } = useSelector(selectMapState)
  const previousRef = useRef(false)
  const previous = previousRef.current
  const showHighVoronoi = isStationDialog(nav) && nav.data.showHighVoronoi

  useEffect(() => {
    if (previous && !showHighVoronoi) {
      // 高次ボロノイ表示中の駅ダイアログから別状態に遷移したとき
      cancel()
    }
  }, [previous, showHighVoronoi, cancel])

  previousRef.current = showHighVoronoi
}
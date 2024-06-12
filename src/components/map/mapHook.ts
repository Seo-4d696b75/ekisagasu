import { MutableRefObject, RefObject, useEffect, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import { LatLng, MapCenter } from "../../location"
import * as action from "../../redux/actions"
import { selectMapState, selectStationState } from "../../redux/selector"
import { AppDispatch } from "../../redux/store"
import { DataType, Line, Station } from "../../station"
import repository from "../../station/repository"
import calculation from "../../voronoi"
import { useRefCallback } from "../hooks"
import { NavType, isStationDialog } from "../navState"
import { PolylineProps, RectBounds, getBounds, getZoomProperty, isInsideRect } from "./diagram"
import { ProgressHandler } from "./progressHook"

/**
 * 地図の操作する関数と状態変数を取得する
 * @param googleMapRef 
 * @param mapElementRef 
 * @returns 
 */
export const useMapOperator = (
  progressHandler: ProgressHandler,
  googleMapRef: MutableRefObject<google.maps.Map | null>,
  mapElementRef: RefObject<HTMLElement>,
) => {

  const {
    radarK,
    nav,
  } = useSelector(selectMapState)

  const {
    dataType
  } = useSelector(selectStationState)

  const dispatch = useDispatch<AppDispatch>()

  // 高次ボロノイの計算中に他状態に遷移した場合に計算をキャンセルする
  const previousRef = useRef(false)
  const previousShowHighVoronoi = previousRef.current
  const showHighVoronoi = isStationDialog(nav) && nav.data.highVoronoi !== null

  useEffect(() => {
    if (previousShowHighVoronoi && !showHighVoronoi) {
      // 高次ボロノイ表示中の駅ダイアログから別状態に遷移したとき
      calculation.cancel?.()
    }
  }, [previousShowHighVoronoi, showHighVoronoi])

  previousRef.current = showHighVoronoi

  // 高次ボロノイの計算開始＆表示
  const showRadarVoronoi = (station: Station) => {
    if (!isStationDialog(nav)) return
    if (nav.data.highVoronoi) {
      dispatch(action.setNavStateIdle())
      return
    }
    progressHandler(
      "レーダー範囲を計算中",
      async () => {
        dispatch(action.startHighVoronoiCalculation())
        for await (const polygon of calculation.calculate(station, radarK)) {
          dispatch(action.setHighVoronoiPolygon(polygon))
        }
      },
    )
  }

  const showPolyline = (line: Line) => {
    const element = mapElementRef.current
    if (!line.detail || !element) return
    if (nav.type !== NavType.DIALOG_LINE) return
    if (nav.data.showPolyline) return
    let polyline: PolylineProps[] = []
    let bounds: RectBounds
    if (line.detail.polylines) {
      polyline = line.detail.polylines
      bounds = line.detail
    } else {
      let stations = line.detail.stations
      let data = getBounds(line.detail.stations)
      polyline = [{
        points: stations.map(s => s.position),
        start: stations[0].name,
        end: stations[stations.length - 1].name,
      }]
      bounds = data
    }

    const rect = element.getBoundingClientRect()
    const center = getZoomProperty(bounds, rect.width, rect.height)

    dispatch(action.requestShowPolyline({
      dialog: nav.data.dialog,
      polylines: polyline,
      stations: line.detail.stations,
      center: center
    }))
  }

  // 直近の探索範囲
  const lastSearchRectRef = useRef<RectBounds>({
    north: 35,
    south: 35,
    west: 135,
    east: 135,
  })
  const lastSearchRect = lastSearchRectRef.current

  //　地図表示範囲の変更時に表示する駅リストを更新する
  const updateBounds = useRefCallback(async (map: google.maps.Map, force?: boolean) => {
    const bounds = map.getBounds()
    const zoom = map.getZoom()
    if (!bounds || !zoom) return
    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()
    const rect = {
      north: ne.lat(),
      east: ne.lng(),
      south: sw.lat(),
      west: sw.lng(),
    }
    if (force || !isInsideRect(rect, lastSearchRect)) {
      await progressHandler(
        "駅を検索中",
        async () => {
          const margin = Math.min(
            Math.max(ne.lat() - sw.lat(), ne.lng() - sw.lng()) * 0.5,
            0.5
          )
          const search = {
            south: sw.lat() - margin,
            north: ne.lat() + margin,
            west: sw.lng() - margin,
            east: ne.lng() + margin,
          }
          await repository.searchRect(search, 2000)
          lastSearchRectRef.current = search
        },
      )
    }
  })

  const closeDialog = async () => {
    await dispatch(action.setNavStateIdle())
  }

  const showStation = (station: Station) => {
    dispatch(action.requestShowStation(station))
  }

  const showLine = (line: Line) => {
    // 詳細情報を非同期で取得する
    progressHandler(
      "路線情報を取得しています",
      dispatch(action.requestShowLine(line)).unwrap(),
    )
  }

  const focusAt = (pos: LatLng, zoom?: number) => {
    if (!dataType) return
    if (showHighVoronoi) return
    dispatch(action.requestShowSelectedPosition({ ...pos, zoom: zoom }))
  }

  const focusAtNearestStation = (pos: LatLng) => {
    if (!dataType) return
    if (showHighVoronoi) return
    progressHandler(
      "駅を探しています",
      dispatch(action.requestShowStation(pos)).unwrap(),
    )
  }

  const requestCurrentPosition = () => {
    progressHandler(
      "現在位置を取得しています",
      async () => {
        await closeDialog()
        await dispatch(action.requestCurrentLocation())
      },
    )
  }

  const switchDataType = async (type: DataType) => {
    // ダイアログで表示中のデータと齟齬が発生する場合があるので強制的に閉じる
    closeDialog()
    // データセット変更時に地図で表示している現在の範囲に合わせて更新＆読み込みする
    const map = googleMapRef.current
    if (map) {
      progressHandler(
        "駅データを切替中",
        async () => {
          await repository.setData(type)
          await updateBounds(map, true)
        },
      )
    }
  }

  return {
    showStation,
    showLine,
    showRadarVoronoi,
    showPolyline,
    updateBounds,
    closeDialog,
    focusAt,
    focusAtNearestStation,
    requestCurrentPosition,
    switchDataType,
  }
}

export const useMapCenterChangeEffect = (
  center: MapCenter,
  googleMapRef: MutableRefObject<google.maps.Map | null>,
  isDragRunning: boolean,
) => {
  const map = googleMapRef.current
  const pos = map?.getCenter()
  const lat = pos?.lat()
  const lng = pos?.lng()
  const zoom = map?.getZoom()
  useEffect(() => {
    if (!map || isDragRunning) return
    if (center.lat !== lat || center.lng !== lng) {
      map.panTo(new google.maps.LatLng(center.lat, center.lng))
    }
    if (center.zoom !== zoom) {
      map.setZoom(center.zoom)
    }
  }, [
    map,
    isDragRunning,
    center.lat,
    center.lng,
    center.zoom,
    lat,
    lng,
    zoom,
  ])
}
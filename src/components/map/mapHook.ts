import { MutableRefObject, RefObject, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { LatLng, MapCenter } from "../../location/location"
import { logger } from "../../logger"
import * as action from "../../redux/actions"
import { selectMapState, selectStationState } from "../../redux/selector"
import { AppDispatch } from "../../redux/store"
import repository, { DataType } from "../../station/StationRepository"
import { Line } from "../../station/line"
import { Station } from "../../station/station"
import { useRefCallback } from "../hooks"
import { NavType, isStationDialog } from "../navState"
import { PolylineProps, RectBounds, getBounds, getZoomProperty, isInsideRect } from "./diagram"
import { ProgressHandler } from "./progressHook"
import { useHighVoronoi } from "./voronoiHook"

const ZOOM_TH = 12
const VORONOI_SIZE_TH = 2000

type HideStationState = {
  hide: boolean
  zoom: number
  rect: RectBounds
  stationSize: number
}

function shouldUpdateBounds(state: HideStationState, zoom: number, rect: RectBounds): boolean {
  if (!state.hide) {
    return zoom >= ZOOM_TH || state.stationSize < VORONOI_SIZE_TH
  }
  if (zoom > state.zoom) return true
  if (!isInsideRect(rect, state.rect)) return true
  return false
}

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

  const [hideState, setHideState] = useState<HideStationState>({
    hide: false,
    zoom: 0,
    rect: {
      south: -90,
      north: 90,
      west: -180,
      east: 180,
    },
    stationSize: 0,
  })
  const hideStationOnMap = hideState.hide

  const dispatch = useDispatch<AppDispatch>()

  // use high-voronoi logic via custom hook
  const { run: runHighVoronoi, cancel: cancelHighVoronoi, highVoronoi } = useHighVoronoi(radarK)

  const showRadarVoronoi = (station: Station) => {
    if (!isStationDialog(nav)) return
    if (nav.data.showHighVoronoi) {
      dispatch(action.setNavStateIdle())
      return
    }
    progressHandler(
      "レーダー範囲を計算中",
      async () => {
        dispatch(action.requestShowHighVoronoi())
        await runHighVoronoi(station)
      }
    )
  }

  const showPolyline = (line: Line) => {
    const map = googleMapRef.current
    if (!line.detail || !map) return
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
    dispatch(action.requestShowPolyline({
      dialog: nav.data.dialog,
      polylines: polyline,
      stations: line.detail.stations,
    }))
    const mapElement = mapElementRef.current
    if (mapElement) {
      var rect = mapElement.getBoundingClientRect()
      var props = getZoomProperty(bounds, rect.width, rect.height)
      map.panTo(props.center)
      map.setZoom(props.zoom)
      logger.d('zoom to', props, line)
    }
  }

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
    if (force || shouldUpdateBounds(hideState, zoom, rect)) {
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
          const result = await repository.searchRect(search, VORONOI_SIZE_TH)
          setHideState({
            hide: zoom < ZOOM_TH && result.length >= VORONOI_SIZE_TH,
            zoom: zoom,
            rect: search,
            stationSize: result.length,
          })
        },
      )
    } else {
      setHideState({
        hide: true,
        zoom: zoom,
        rect: hideState.rect,
        stationSize: hideState.stationSize,
      })
    }
  })

  const closeDialog = async () => {
    // if any worker is running, terminate it
    cancelHighVoronoi()
    await dispatch(action.setNavStateIdle())
  }

  const showStation = (station: Station) => {
    cancelHighVoronoi()
    dispatch(action.requestShowStation(station))
  }

  const showLine = (line: Line) => {
    cancelHighVoronoi()
    // 詳細情報を非同期で取得する
    progressHandler(
      "路線情報を取得しています",
      dispatch(action.requestShowLine(line)).unwrap(),
    )
  }

  const focusAt = (pos: LatLng, zoom?: number) => {
    if (!dataType) return
    if (isStationDialog(nav) && nav.data.showHighVoronoi) return
    dispatch(action.requestShowSelectedPosition({ ...pos, zoom: zoom }))
  }

  const focusAtNearestStation = (pos: LatLng) => {
    if (!dataType) return
    if (isStationDialog(nav) && nav.data.showHighVoronoi) return
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
    highVoronoi,
    hideStationOnMap,
    googleMapRef,
    mapElementRef,
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
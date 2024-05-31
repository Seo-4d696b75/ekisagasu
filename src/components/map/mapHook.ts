import { MutableRefObject, RefObject, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { logger } from "../../logger"
import { PolylineProps, RectBounds, getBounds, getZoomProperty, isInsideRect } from "../../model/diagram"
import { Line } from "../../model/line"
import { LatLng, MapCenter } from "../../model/location"
import { Station } from "../../model/station"
import * as action from "../../redux/actions"
import { selectMapState } from "../../redux/selector"
import { AppDispatch } from "../../redux/store"
import StationService, { DataType } from "../../script/StationService"
import { useRefCallback } from "../hooks"
import { NavType, isStationDialog } from "../navState"
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
  progressHandler: (task: Promise<void> | (() => Promise<void>), text: string) => any,
  googleMapRef: MutableRefObject<google.maps.Map | null>,
  mapElementRef: RefObject<HTMLElement>,
) => {

  const {
    radarK,
    nav,
  } = useSelector(selectMapState)

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

  const showStation = (station: Station) => {
    dispatch(action.requestShowStation(station))
  }

  const showLine = (line: Line) => {
    dispatch(action.requestShowLine(line))
  }

  // use high-voronoi logic via custom hook
  const { run: runHighVoronoi, cancel: cancelHighVoronoi, highVoronoi, workerRunning } = useHighVoronoi(radarK)

  const showRadarVoronoi = (station: Station) => {
    if (!isStationDialog(nav)) return
    if (nav.data.showHighVoronoi) {
      dispatch(action.setNavStateIdle())
      return
    }
    progressHandler(new Promise<void>((resolve, reject) => {
      runHighVoronoi(station, {
        onStart: (_) => dispatch(action.requestShowHighVoronoi()),
        onComplete: (station, list) => {
          resolve()
          const map = googleMapRef.current
          const mapElement = mapElementRef.current
          if (map && mapElement) {
            var rect = mapElement.getBoundingClientRect()
            var bounds = getBounds(list[radarK - 1])
            var props = getZoomProperty(bounds, rect.width, rect.height, ZOOM_TH, station.position, 100)
            map.panTo(props.center)
            map.setZoom(props.zoom)
          }
        },
        onError: (e) => {
          reject(e)
          dispatch(action.setNavStateIdle())
        },
        onCancel: () => reject(),
      })
    }), "レーダー範囲を計算中")
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
      const result = await StationService.searchRect(search, VORONOI_SIZE_TH)
      setHideState({
        hide: zoom < ZOOM_TH && result.length >= VORONOI_SIZE_TH,
        zoom: zoom,
        rect: search,
        stationSize: result.length,
      })
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

  const focusAt = (pos: LatLng, zoom?: number) => {
    if (!StationService.initialized) return
    if (isStationDialog(nav) && nav.data.showHighVoronoi) return
    dispatch(action.requestShowSelectedPosition({ ...pos, zoom: zoom }))
  }

  const focusAtNearestStation = (pos: LatLng) => {
    if (!StationService.initialized) return
    if (isStationDialog(nav) && nav.data.showHighVoronoi) return
    StationService.searchStations(pos, 1).then(result => {
      const s = result[0].station
      logger.d("nearest station found", s)
      dispatch(action.requestShowStation(s))
    })
  }

  const requestCurrentPosition = () => {
    progressHandler(async () => {
      await closeDialog()
      await dispatch(action.requestCurrentLocation())
    }, "現在位置を取得しています")
  }

  const switchDataType = async (type: DataType) => {
    // ダイアログで表示中のデータと齟齬が発生する場合があるので強制的に閉じる
    closeDialog()
    // データセット変更時に地図で表示している現在の範囲に合わせて更新＆読み込みする
    const map = googleMapRef.current
    if (map) {
      progressHandler(async () => {
        await StationService.setData(type)
        dispatch(action.clearLoadedStation())
        await updateBounds(map, true)
      }, "駅データを切り替えています")
    }
  }

  return {
    highVoronoi,
    workerRunning,
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
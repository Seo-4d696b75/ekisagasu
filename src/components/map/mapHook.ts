import { MutableRefObject, RefObject, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import * as action from "../../script/actions"
import { Line } from "../../script/line"
import { LatLng } from "../../script/location"
import { selectMapState } from "../../script/mapState"
import { Station } from "../../script/station"
import StationService from "../../script/StationService"
import { AppDispatch } from "../../script/store"
import { getBounds, getZoomProperty, isInsideRect, PolylineProps, RectBounds } from "../../script/utils"
import { useRefCallback } from "../hooks"
import { isStationDialog, NavType } from "../navState"
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
  googleMapRef: MutableRefObject<google.maps.Map<Element> | null>,
  mapElementRef: RefObject<HTMLElement>,
) => {

  const {
    radarK,
    nav,
    watchCurrentLocation,
    currentLocation,
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

  const moveToPosition = (pos: LatLng | null, minZoom: number = 0) => {
    const map = googleMapRef.current
    if (pos && map) {
      map.panTo(new google.maps.LatLng(pos.lat, pos.lng))
      if (map.getZoom() < minZoom) {
        map.setZoom(minZoom)
      }
    }
  }

  const setCenterCurrentPosition = async (map: google.maps.Map) => progressHandler(
    async () => {
      try {
        const pos = await StationService.getCurrentPosition()
        let latLng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }
        map.setCenter(latLng)
        dispatch(action.setCurrentLocation(pos))
      } catch (err) {
        console.warn(err)
        alert("現在位置を利用できません. ブラウザから位置情報へのアクセスを許可してください.")
        const latLng = { lat: 35.681236, lng: 139.767125 }
        map.setCenter(latLng)
      }
    },
    "現在位置を取得しています",
  )

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
      console.log('zoom to', props, line)
    }
  }

  const updateBounds = useRefCallback(async (map: google.maps.Map, force?: boolean) => {
    const bounds = map.getBounds()
    if (!bounds) return
    const zoom = map.getZoom()
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
      const result = await StationService.updateRect(search, VORONOI_SIZE_TH)
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

  const closeDialog = () => {
    // if any worker is running, terminate it
    cancelHighVoronoi()
    dispatch(action.setNavStateIdle())
  }

  const focusAt = (pos: LatLng) => {
    if (!StationService.initialized) return
    if (isStationDialog(nav) && nav.data.showHighVoronoi) return
    dispatch(action.requestShowSelectedPosition(pos))
  }

  const focusAtNearestStation = (pos: LatLng) => {
    if (!StationService.initialized) return
    if (isStationDialog(nav) && nav.data.showHighVoronoi) return
    StationService.updateLocation(pos, radarK, 0).then(s => {
      console.log("update location", s)
      if (s) dispatch(action.requestShowStation(s))
    })
  }

  const requestCurrentPosition = () => {
    dispatch(action.setNavStateIdle())
    if (watchCurrentLocation) {
      const pos = currentLocation?.position
      if (pos) {
        moveToPosition(pos, 14)
      }
    } else {
      closeDialog()
      progressHandler(async () => {
        const pos = await StationService.getCurrentPosition()
        moveToPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 14)
      }, "現在位置を取得しています")
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
    moveToPosition,
    setCenterCurrentPosition,
    showRadarVoronoi,
    showPolyline,
    updateBounds,
    closeDialog,
    focusAt,
    focusAtNearestStation,
    requestCurrentPosition,
  }
}

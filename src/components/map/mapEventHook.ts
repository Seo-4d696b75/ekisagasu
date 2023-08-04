import { IMapProps } from "google-maps-react"
import qs from "query-string"
import { MutableRefObject, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useLocation } from "react-router-dom"
import StationService from "../../script/StationService"
import * as action from "../../script/actions"
import { Line } from "../../script/line"
import { LatLng } from "../../script/location"
import { selectMapState } from "../../script/mapState"
import { Station } from "../../script/station"
import { AppDispatch } from "../../script/store"
import { parseQueryBoolean } from "../../script/utils"
import { useRefCallback } from "../hooks"
import { NavType, isStationDialog } from "../navState"

function getUIEvent(clickEvent: any): UIEvent {
  // googlemap onClick などのコールバック関数に渡させるイベントオブジェクトの中にあるUIEventを抽出
  // property名が謎
  // スマホではTouchEvent, マウスでは MouseEvent
  for (var p in clickEvent) {
    if (clickEvent[p] instanceof UIEvent) return clickEvent[p]
  }
  throw Error("UIEvent not found")
}

/**
 * 地図上のEventをハンドリングするコールバック関数を使用する
 * @param screenWide 現在の画面の状態
 * @param operator 地図の操作方法を教えてね
 * @returns 
 */
export const useMapCallback = (screenWide: boolean, googleMapRef: MutableRefObject<google.maps.Map<Element> | null>, progressHandler: <T, >(task: Promise<T>, text: string) => Promise<T>, operator: {
  moveToPosition: (pos: LatLng | null, zoom?: number) => void
  focusAt: (pos: LatLng, zoom?: number) => void
  focusAtNearestStation: (pos: LatLng) => void
  closeDialog: () => void
  updateBounds: (map: google.maps.Map) => void
  showPolyline: (line: Line) => void
  showRadarVoronoi: (station: Station) => void
  setCenterCurrentPosition: (map: google.maps.Map) => Promise<void>
}) => {

  const {
    nav,
  } = useSelector(selectMapState)

  const location = useLocation()
  const dispatch = useDispatch<AppDispatch>()

  const uiEventRef = useRef<UIEvent | null>(null)

  const onMapClicked = (props?: IMapProps, map?: google.maps.Map, event?: any) => {
    const pos = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    }
    const previous = uiEventRef.current
    if (previous && getUIEvent(event).timeStamp - previous.timeStamp > 300) {
      console.log("map long clicked", pos, event)
      operator.focusAt(pos)
    } else {
      console.log("map clicked", event)
      operator.focusAtNearestStation(pos)
    }
  }

  const onMapRightClicked = (props?: IMapProps, map?: google.maps.Map, event?: any) => {
    const pos = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    }
    //console.log("right click", pos, event)
    operator.focusAt(pos)
  }

  const onMapDragStart = (props?: IMapProps, map?: google.maps.Map) => {
    if (isStationDialog(nav) && nav.data.showHighVoronoi) return
    if (nav.type === NavType.DIALOG_LINE && nav.data.showPolyline) return
    if (!screenWide) {
      operator.closeDialog()
    }
  }

  const onMapIdle = (props?: IMapProps, map?: google.maps.Map, event?: any) => {
    if (StationService.initialized && map) {
      operator.updateBounds(map)
    }
  }

  /* 非同期関数内からコールバック関数を呼び出す場合、
  非同期処理による変更前の古い状態をクロージャで参照したコールバック関数を呼び出してしまい
  意図しない挙動をする
  そのため、最新のコールバック関数を必ず呼び出すようにする */
  const showPolylineRef = useRefCallback(operator.showPolyline)
  const showRadarVoronoiRef = useRefCallback(operator.showRadarVoronoi)

  const onMapReady = async (props?: IMapProps, map?: google.maps.Map, event?: any) => {
    console.log("map ready", props)
    if (map) {

      map.addListener("mousedown", event => uiEventRef.current = getUIEvent(event))
      googleMapRef.current = map
      map.setOptions({
        // this option can not be set via props in google-maps-react
        mapTypeControlOptions: {
          position: google.maps.ControlPosition.TOP_RIGHT,
          style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
        }
      })
      dispatch(action.setNavStateIdle())

      // parse query actions
      const query = qs.parse(location.search)

      // extraデータの表示フラグ
      const type = parseQueryBoolean(query.extra) ? 'extra' : 'main'

      const s = await progressHandler(StationService.initialize(type), "駅データを初期化中")

      // 路線情報の表示
      if (typeof query.line === 'string') {
        const line = s.getLineById(query.line)
        if (line) {
          try {
            const result = await dispatch(action.requestShowLine(line)).unwrap()
            // マップ中心位置を路線ポリラインに合わせる
            showPolylineRef(result.line)
            return
          } catch (e) {
            console.warn("fail to show line details. query:", query.line, e)
          }
        }
      }

      // 駅情報の表示
      if (typeof query.station === 'string') {
        try {
          const result = await dispatch(action.requestShowStationPromise(
            progressHandler(s.getStationById(query.station), `駅情報(${query.station})を探しています`)
          )).unwrap()
          if (parseQueryBoolean(query.voronoi)) {
            showRadarVoronoiRef(result.station)
          }
          return
        } catch (e) {
          console.warn("fail to show station, query:", query.station, e)
        }
      }

      // 現在位置を監視・追尾するフラグ
      if (typeof query.mylocation === 'string' && parseQueryBoolean(query.mylocation)) {
        dispatch(action.setWatchCurrentLocation(true))
        return
      }

      // 指定位置への移動
      if (typeof query.lat === 'string' && typeof query.lng === 'string') {
        const lat = parseFloat(query.lat)
        const lng = parseFloat(query.lng)
        if (20 < lat && lat < 50 && 120 < lng && lng < 150) {
          const zoom = (() => {
            if (typeof query.zoom === 'string') {
              const value = parseFloat(query.zoom)
              if (10 <= value && value <= 20) {
                return value
              }
            }
          })()
          if (parseQueryBoolean(query.dialog)) {
            operator.focusAt({ lat: lat, lng: lng }, zoom)
          } else {
            operator.moveToPosition({ lat: lat, lng: lng }, zoom)
          }
          return
        }
      }

      // 指定なしの場合は現在位置（取得可能なら）に合わせる
      operator.setCenterCurrentPosition(map)

    }
  }

  return {
    onMapClicked,
    onMapRightClicked,
    onMapDragStart,
    onMapIdle,
    onMapReady,
  }
}
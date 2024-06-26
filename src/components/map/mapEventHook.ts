import { MutableRefObject, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useSearchParams } from "react-router-dom"
import { LatLng } from "../../location"
import { logger } from "../../logger"
import * as action from "../../redux/actions"
import { selectMapState, selectStationState } from "../../redux/selector"
import { AppDispatch } from "../../redux/store"
import { Line, Station } from "../../station"
import repository from "../../station/repository"
import { useRefCallback } from "../hooks"
import { NavType, isStationDialog } from "../navState"
import { parseQueryBoolean } from "./diagram"
import { ProgressHandler } from "./progressHook"

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
export const useMapCallback = (
  screenWide: boolean,
  googleMapRef: MutableRefObject<google.maps.Map | null>,
  operator: {
    focusAt: (pos: LatLng, zoom?: number) => void
    focusAtNearestStation: (pos: LatLng) => void
    closeDialog: () => void
    updateBounds: (map: google.maps.Map) => void
    showPolyline: (line: Line) => void
    showRadarVoronoi: (station: Station) => void
    requestCurrentPosition: () => void
    progressHandler: ProgressHandler
  },
) => {

  const {
    nav,
  } = useSelector(selectMapState)

  const {
    dataType
  } = useSelector(selectStationState)

  const dataInitialized = dataType !== null

  const [query,] = useSearchParams()

  const dispatch = useDispatch<AppDispatch>()

  const onMouseDownEventRef = useRef<Event | null>(null)

  const onMouseDown = (event: google.maps.MapMouseEvent) => {
    if (event.domEvent instanceof Event) {
      onMouseDownEventRef.current = event.domEvent
    }
  }

  const onMapClicked = (event: google.maps.MapMouseEvent) => {
    if (!event.latLng) return
    const pos = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    }
    const previous = onMouseDownEventRef.current
    if (previous && getUIEvent(event).timeStamp - previous.timeStamp > 300) {
      logger.d("map long clicked", pos, event)
      operator.focusAt(pos)
    } else {
      logger.d("map clicked", event)
      operator.focusAtNearestStation(pos)
    }
  }

  const onMapRightClicked = (event: google.maps.MapMouseEvent) => {
    if (!event.latLng) return
    const pos = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    }
    logger.d("right click", pos, event)
    operator.focusAt(pos)
  }

  const onMapDragStart = () => {
    dispatch(action.setUserDragging(true))
    if (isStationDialog(nav) && nav.data.highVoronoi) return
    if (nav.type === NavType.DIALOG_LINE && nav.data.showPolyline) return
    if (!screenWide) {
      operator.closeDialog()
    }
  }

  const onMapIdle = () => {
    const map = googleMapRef.current
    const pos = map?.getCenter()
    const zoom = map?.getZoom()
    if (pos && zoom) {
      const payload = {
        lat: pos.lat(),
        lng: pos.lng(),
        zoom: zoom,
      }
      dispatch(action.setMapCenter(payload))
    }
    if (dataInitialized && map) {
      operator.updateBounds(map)
    }
    dispatch(action.setUserDragging(false))
  }

  /* 非同期関数内からコールバック関数を呼び出す場合、
  非同期処理による変更前の古い状態をクロージャで参照したコールバック関数を呼び出してしまい
  意図しない挙動をする
  そのため、最新のコールバック関数を必ず呼び出すようにする */
  const showPolylineRef = useRefCallback(operator.showPolyline)
  const showRadarVoronoiRef = useRefCallback(operator.showRadarVoronoi)

  const onMapReady = async (map: google.maps.Map) => {
    googleMapRef.current = map

    // extraデータの表示フラグ
    const type = parseQueryBoolean(query.get('extra')) ? 'extra' : 'main'

    await operator.progressHandler(
      "駅データを初期化中",
      async () => {
        const initialCenter = {
          lat: 35.681236,
          lng: 139.767125,
          zoom: 14,
        }
        dispatch(action.setMapCenter(initialCenter))
        dispatch(action.setNavStateIdle())

        // データの初期化
        await repository.initialize(type)

        // GlobalMapStateに反映する
        dispatch(action.setDataType(type))
      }
    )

    let queryResolved = false

    // 路線情報の表示
    const queryLine = query.get('line')
    if (typeof queryLine === 'string' && !queryResolved) {
      await operator.progressHandler(
        "路線情報を取得しています",
        async () => {
          try {
            const result = await dispatch(action.requestShowLine(queryLine)).unwrap()
            // マップ中心位置を路線ポリラインに合わせる
            showPolylineRef(result.line)
            queryResolved = true
          } catch (e) {
            logger.w("fail to show line details. query:", queryLine, e)
          }
        }
      )
    }

    // 駅情報の表示
    const queryStation = query.get('station')
    if (typeof queryStation === 'string' && !queryResolved) {
      await operator.progressHandler(
        "駅情報を取得しています",
        async () => {
          try {
            const result = await dispatch(action.requestShowStation(queryStation)).unwrap()
            if (parseQueryBoolean(query.get('voronoi'))) {
              showRadarVoronoiRef(result.station)
            }
            queryResolved = true
          } catch (e) {
            logger.w("fail to show station, query:", queryStation, e)
          }
        }
      )
    }

    // 指定位置への移動
    const queryLat = query.get('lat')
    const queryLng = query.get('lng')
    if (typeof queryLat === 'string' && typeof queryLng === 'string' && !queryResolved) {
      const lat = parseFloat(queryLat)
      const lng = parseFloat(queryLng)
      if (20 < lat && lat < 50 && 120 < lng && lng < 150) {
        const zoom = (() => {
          const queryZoom = query.get('zoom')
          if (typeof queryZoom === 'string') {
            const value = parseFloat(queryZoom)
            if (10 <= value && value <= 20) {
              return value
            }
          }
        })()
        if (parseQueryBoolean(query.get('dialog'))) {
          dispatch(action.requestShowSelectedPosition({ lat: lat, lng: lng }))
        } else {
          const center = {
            lat: lat,
            lng: lng,
            zoom: zoom ?? 14,
          }
          dispatch(action.setMapCenter(center))
        }
        queryResolved = true
      }
    }

    // 現在位置を監視・追尾するフラグ
    if (parseQueryBoolean(query.get('mylocation')) && !queryResolved) {
      dispatch(action.setWatchCurrentLocation(true))
      queryResolved = true
    }

    // 指定なしの場合は現在位置（取得可能なら）に合わせる
    if (!queryResolved) {
      operator.requestCurrentPosition()
    }
  }

  return {
    onMouseDown,
    onMapClicked,
    onMapRightClicked,
    onMapDragStart,
    onMapIdle,
    onMapReady,
  }
}

// TODO Marker実装は本家のgooglemaps apiを直接使っている

import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { useEffect, useRef, useState } from "react";

import { useSelector } from "react-redux";
import pin_station from "../../img/map_pin_station.svg";
import pin_station_extra from "../../img/map_pin_station_extra.svg";
import { selectMapState, selectStationState } from "../../redux/selector";
import { NavType } from "../navState";

/*
  react-google-maps/api には以下の問題がある
  - 非推奨の Marker しかサポートしていない
  - MarkerCluster のパフォーマンスが悪い（数百以上のマーカーを表示できない）
 */
export const useStationMarkers = (
  map: google.maps.Map | null,
) => {

  const { stations } = useSelector(selectStationState)
  const { nav, showStationPin } = useSelector(selectMapState)
  const showMarker = showStationPin && nav.type === NavType.IDLE

  // react-google-maps/api では googlemaps api を非同期でロードするため、
  // 初期化時に new MarkerClusterer() を呼ぶと ReferenceError になる
  const [clusterer, setClusterer] = useState<MarkerClusterer | null>(null)

  const markersRef = useRef(new Map<number, google.maps.Marker>())
  const markers = markersRef.current

  // 初期化
  useEffect(() => {
    if (map) {
      setClusterer(new MarkerClusterer({}))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // マーカー更新
  useEffect(() => {
    if (!clusterer || !map) return
    if (showMarker) {
      // 描画対象は増加のみと仮定
      const added = stations
        .filter(s => !markers.get(s.code))
        .map(s => {
          // TODO AdvancedMarkerElementへの移行
          // https://developers.google.com/maps/documentation/javascript/advanced-markers/migration?hl=ja
          const marker = new google.maps.Marker({
            map: map,
            position: s.position,
            icon: s.extra ? pin_station_extra : pin_station,
          })
          markers.set(s.code, marker)
          return marker
        })
      clusterer.setMap(map)
      clusterer.addMarkers(added)
    } else {
      clusterer.setMap(null)
      clusterer.clearMarkers(true)
      markers.forEach(m => m.setMap(null))
      markers.clear()
    }
  }, [map, stations, clusterer, showMarker, markers])
}

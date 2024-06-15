
// TODO Marker実装は本家のgooglemaps apiを直接使っている

import { Cluster, ClusterStats, MarkerClusterer, Renderer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";
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

  // 初期化
  useEffect(() => {
    if (map) {
      setClusterer(new MarkerClusterer({
        renderer: new CustomClusterRenderer(),
        // see: https://www.npmjs.com/package/supercluster
        algorithm: new SuperClusterAlgorithm({
          // zoom 13 以上ではクラスタリング表示しない
          maxZoom: 12,
          // マーカー4個未満のクラスターは生成しない 
          // voronoi分割の境界線を接する駅集合は2〜３個程度
          minPoints: 4,
          // クラスターの密度
          radius: 80,
        }),
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // マーカー更新
  useEffect(() => {
    if (!clusterer || !map) return

    if (showMarker) {
      // MarkerClusterの仕様上、差分を検出する必要がある
      const exists = markersRef.current
      const next = new Map<number, google.maps.Marker>()
      const added: google.maps.Marker[] = []

      for (const s of stations) {
        const m = exists.get(s.code)
        if (m) {
          exists.delete(s.code)
          next.set(s.code, m)
        } else {
          // TODO AdvancedMarkerElementへの移行
          // https://developers.google.com/maps/documentation/javascript/advanced-markers/migration?hl=ja
          const marker = new google.maps.Marker({
            map: map,
            position: s.position,
            icon: s.extra ? pin_station_extra : pin_station,
          })
          next.set(s.code, marker)
          added.push(marker)
        }
      }

      // データセット切替時に減少する場合もある
      const removed = Array.from(exists.values())
      removed.forEach(m => m.setMap(null))

      next.forEach(m => m.setMap(map))
      clusterer.setMap(map)

      clusterer.removeMarkers(removed)
      clusterer.addMarkers(added)
      markersRef.current = next
    } else {
      clusterer.setMap(null)
      clusterer.clearMarkers()
      markersRef.current.forEach(m => m.setMap(null))
      markersRef.current.clear()
    }
  }, [map, stations, clusterer, showMarker, markersRef])
}

// see DefaultRenderer implementation
// https://googlemaps.github.io/js-markerclusterer/classes/DefaultRenderer.html
class CustomClusterRenderer implements Renderer {
  render(cluster: Cluster, stats: ClusterStats, map: google.maps.Map): google.maps.Marker {
    const count = cluster.count
    // change color if this cluster has more markers than the mean cluster
    const color =
      count > Math.max(10, stats.clusters.markers.mean)
        ? "#0000EE"
        : "#4444FF";

    // create svg url with fill color
    const svg = window.btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="45px" height="45px">
  <g fill="${color}">
  <circle cx="120" cy="120" opacity=".6" r="70" />
  <circle cx="120" cy="120" opacity=".3" r="90" />
  <circle cx="120" cy="120" opacity=".2" r="110" />
  <circle cx="120" cy="120" opacity=".1" r="130" />
  </g>
  <text x="50%" y="50%" fill="#EEE" text-anchor="middle" alignment-baseline="middle" font-size="60" font-family="Menlo, Monaco, 'Courier New', Consolas, monospace">${count}</text>
</svg>`);

    // create marker using svg icon
    return new google.maps.Marker({
      position: cluster.position,
      icon: `data:image/svg+xml;base64,${svg}`,
    });
  }
}

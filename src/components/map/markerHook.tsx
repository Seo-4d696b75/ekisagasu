import { Cluster, ClusterStats, Renderer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { selectMapState, selectStationState } from "../../redux/selector";
import { NavType } from "../navState";
import AdvancedMarker from "./AdvancedMarker";

import pin_station from "../../img/map_pin_station.svg";
import pin_station_extra from "../../img/map_pin_station_extra.svg";
import MarkerCluster from "./MarkerCluster";

/*
  react-google-maps/api には以下の問題がある
  - 非推奨の Marker しかサポートしていない
  - MarkerCluster のパフォーマンスが悪い（数百以上のマーカーを表示できない）
 */
export const useStationMarkers = () => {

  const { stations } = useSelector(selectStationState)
  const { nav, showStationPin } = useSelector(selectMapState)
  const showMarker = showStationPin && nav.type === NavType.IDLE

  // クラスタリングの設定
  // see: https://www.npmjs.com/package/supercluster
  const renderer = useMemo(() => new CustomClusterRenderer(), [])
  const algorithm = useMemo(() => new SuperClusterAlgorithm({
    // zoom 13 以上ではクラスタリング表示しない
    maxZoom: 12,
    // マーカー4個未満のクラスターは生成しない 
    // voronoi分割の境界線を接する駅集合は2〜３個程度
    minPoints: 4,
    // クラスターの密度
    radius: 80,
  }), [])

  return (
    <MarkerCluster
      renderer={renderer}
      algorithm={algorithm}>
      {showMarker ? stations.map(s => (
        <AdvancedMarker
          key={`station marker ${s.code}`}
          position={s.position}>
          <img src={s.extra ? pin_station_extra : pin_station} alt={s.name} />
        </AdvancedMarker>
      )) : null}
    </MarkerCluster>
  )
}

// see DefaultRenderer implementation
// https://googlemaps.github.io/js-markerclusterer/classes/DefaultRenderer.html
class CustomClusterRenderer implements Renderer {
  parser = new DOMParser()

  render(cluster: Cluster, stats: ClusterStats, map: google.maps.Map): google.maps.marker.AdvancedMarkerElement {
    const count = cluster.count
    // change color if this cluster has more markers than the mean cluster
    const color =
      count > Math.max(10, stats.clusters.markers.mean)
        ? "#0000EE"
        : "#4444FF";

    // create svg url with fill color
    // see https://developers.google.com/maps/documentation/javascript/advanced-markers/graphic-markers?hl=ja&_gl=1*yney1h*_up*MQ..*_ga*MjE0NzQzNzg5MS4xNzMxMTU2ODky*_ga_NRWSTWS78N*MTczMTE1Njg5Mi4xLjAuMTczMTE1Njg5Mi4wLjAuMA..#inline-svg
    const svg = this.parser.parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="45px" height="45px">
  <g fill="${color}">
  <circle cx="120" cy="120" opacity=".6" r="70" />
  <circle cx="120" cy="120" opacity=".3" r="90" />
  <circle cx="120" cy="120" opacity=".2" r="110" />
  <circle cx="120" cy="120" opacity=".1" r="130" />
  </g>
  <text x="50%" y="50%" fill="#EEE" text-anchor="middle" alignment-baseline="middle" font-size="60" font-family="Menlo, Monaco, 'Courier New', Consolas, monospace">${count}</text>
</svg>`,
      'image/svg+xml',
    ).documentElement;

    return new google.maps.marker.AdvancedMarkerElement({
      position: cluster.position,
      content: svg,
    });
  }
}

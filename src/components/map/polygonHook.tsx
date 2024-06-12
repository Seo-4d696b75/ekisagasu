import { Polygon } from "@react-google-maps/api"
import { useMemo } from "react"
import { useSelector } from "react-redux"
import { LatLng } from "../../location"
import { selectMapState, selectStationState } from "../../redux/selector"
import { isStationDialog } from "../navState"

export const useVoronoiPolygons = () => {

  const { mapCenter, nav } = useSelector(selectMapState)
  const zoom = mapCenter.zoom
  const show = !(isStationDialog(nav) && nav.data.highVoronoi)

  const { stations } = useSelector(selectStationState)

  return useMemo(() => {
    if (!show) return null

    return stations
      .filter(s => calculateArea(s.voronoiPolygon, zoom) > 50)
      .map(s => (
        <Polygon
          key={s.code}
          paths={s.voronoiPolygon}
          options={{
            strokeColor: '#0000FF',
            strokeWeight: 1,
            strokeOpacity: 0.8,
            fillOpacity: 0,
            clickable: false,
          }} />
      ))
  }, [show, stations, zoom])
}

/**
 * 特定zoomレベルにおけるポリゴンの面積を仮想ピクセル平方単位で簡易的に計算
 * 
 * @param polygon 
 * @param zoom 
 */
function calculateArea(polygon: LatLng[], zoom: number) {
  if (polygon.length < 3) return 0
  const points = polygon.map(p => getPixelCoordinate(p, zoom))
  const p1 = points[0]
  let s = 0
  for (let i = 1; i < points.length - 1; i++) {
    const p2 = points[i]
    const p3 = points[i + 1]
    s += Math.abs((p1.lng - p3.lng) * (p2.lat - p3.lat) - (p2.lng - p3.lng) * (p1.lat - p3.lat)) / 2
  }
  return s
}

function getPixelCoordinate(point: LatLng, zoom: number): LatLng {
  let x = 128 * (point.lng / 180 + 1) * Math.pow(2, zoom)
  let y = Math.log10(Math.tan(Math.PI / 4 + point.lat * Math.PI / 180 / 2))
  y = 128 * (1 - y / Math.PI) * Math.pow(2, zoom)
  return { lat: y, lng: x }
}
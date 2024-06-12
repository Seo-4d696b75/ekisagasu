import { LatLng } from "../location"
import { logger } from "../logger"

export interface DelaunayStation {
  code: number
  lat: number
  lng: number
  next: number[]
}

export interface Station {
  code: number
  id: string
  name: string
  position: LatLng
  nameKana: string
  prefecture: number
  lines: number[]
  voronoiPolygon: LatLng[]
  voronoiArea: number
  extra: boolean
}



export interface StationAPIResponse {
  code: number
  id: string
  name: string
  lat: number
  lng: number
  name_kana: string
  prefecture: number
  lines: number[]
  extra?: boolean
  voronoi: {
    type: "Feature"
    geometry: {
      type: "Polygon"
      coordinates: number[][][]
    } | {
      type: "LineString"
      coordinates: number[][]
    }
  }
}

export function parseStation(data: StationAPIResponse): Station {

  let voronoiList: LatLng[] = []
  const voronoi = data.voronoi
  const geo = voronoi.geometry
  switch (geo.type) {
    case 'Polygon':
      voronoiList = geo.coordinates[0].map(e => {
        return { lat: e[1], lng: e[0] }
      })
      break
    case 'LineString':
      voronoiList = geo.coordinates.map(e => {
        return { lat: e[1], lng: e[0] }
      })
      break
    default:
      logger.e("invalid voronoi geometry", geo)
  }

  return {
    code: data.code,
    id: data.id,
    name: data.name,
    position: {
      lat: data.lat,
      lng: data.lng,
    },
    nameKana: data.name_kana,
    prefecture: data.prefecture,
    lines: data.lines,
    voronoiPolygon: voronoiList,
    voronoiArea: calculateArea(voronoiList),
    extra: !!data.extra,
  }
}

/**
 * zoom=0でのポリゴンの面積を仮想ピクセル平方単位で簡易的に計算
 * 
 * @param polygon 
 * @param zoom 
 */
function calculateArea(polygon: LatLng[]) {
  if (polygon.length < 3) return 0
  const points = polygon.map(p => getPixelCoordinate(p))
  const p1 = points[0]
  let s = 0
  for (let i = 1; i < points.length - 1; i++) {
    const p2 = points[i]
    const p3 = points[i + 1]
    s += Math.abs((p1.lng - p3.lng) * (p2.lat - p3.lat) - (p2.lng - p3.lng) * (p1.lat - p3.lat)) / 2
  }
  return s
}

function getPixelCoordinate(point: LatLng): LatLng {
  let x = 128 * (point.lng / 180 + 1)
  let y = Math.log10(Math.tan(Math.PI / 4 + point.lat * Math.PI / 180 / 2))
  y = 128 * (1 - y / Math.PI)
  return { lat: y, lng: x }
}

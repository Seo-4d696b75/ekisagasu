import { logger } from "../script/logger"
import { LatLng } from "./location"

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
    extra: !!data.extra,
  }
}
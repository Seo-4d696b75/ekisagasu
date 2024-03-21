import { parseStation, Station, StationAPIResponse } from "./station"
import { PolylineProps } from "./utils"

export interface Line {

  id: string
  code: number
  name: string
  nameKana: string
  stationSize: number
  color: string
  extra: boolean

  detail?: LineDetail
}

export interface LineDetail {
  stations: Station[]
  polylines: PolylineProps[]
  north: number
  south: number
  east: number
  west: number
}

export interface LineAPIResponse {
  id: string
  code: number
  name: string
  name_kana: string
  station_size: number
  color?: string
  extra?: boolean
}

export interface LineDetailAPIResponse extends LineAPIResponse {
  station_list: StationAPIResponse[]
}

export interface PolylineAPIResponse {
  type: "FeatureCollection",
  features: {
    type: "Feature"
    geometry: {
      type: "LineString"
      coordinates: number[][]
    },
    properties: {
      start: string
      end: string
    }
  }[]
  properties: {
    north: number
    south: number
    east: number
    west: number
  }
}

export function parseLine(data: LineAPIResponse): Line {
  return {
    id: data.id,
    code: data.code,
    name: data.name,
    nameKana: data.name_kana,
    stationSize: data.station_size,
    color: data.color ?? '#CCCCCC',
    extra: !!data.extra,
  }
}

export function parseLineDetail(detail: LineDetailAPIResponse, geo: PolylineAPIResponse): LineDetail {
  return {
    stations: detail.station_list.map(e => parseStation(e)),
    polylines: geo.features.map(e => {
      let points = e.geometry.coordinates.map(p => ({ lat: p[1], lng: p[0] }))
      return {
        points: points,
        start: e.properties.start,
        end: e.properties.end,
      }
    }) ?? [],
    north: geo.properties?.north ?? 90,
    south: geo.properties?.south ?? -90,
    east: geo.properties?.east ?? 180,
    west: geo.properties?.west ?? -180,
  }
}
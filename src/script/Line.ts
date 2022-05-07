import { parseStation, Station, StationAPIResponse } from "./station"
import { PolylineProps } from "./utils"

export interface Line {

  id: string
  code: number
  name: string
  nameKana: string
  stationSize: number
  color: string

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
}

export interface LineDetailAPIResponse extends LineAPIResponse {
  station_list: StationAPIResponse[]
  polyline_list?: {
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
}

export function parseLine(data: LineAPIResponse): Line {
  return {
    id: data['id'],
    code: data['code'],
    name: data['name'],
    nameKana: data['name_kana'],
    stationSize: data['station_size'],
    color: data['color'] ?? '#CCCCCC',
  }
}

export function parseLineDetail(data: LineDetailAPIResponse): LineDetail {
  const collection = data.polyline_list
  return {
    stations: data.station_list.map(e => parseStation(e)),
    polylines: collection?.features?.map(e => {
      let points = e.geometry.coordinates.map(p => ({ lat: p[1], lng: p[0] }))
      return {
        points: points,
        start: e.properties.start,
        end: e.properties.end,
      }
    }) ?? [],
    north: collection?.properties?.north ?? 90,
    south: collection?.properties?.south ?? -90,
    east: collection?.properties?.east ?? 180,
    west: collection?.properties?.west ?? -180,
  }
}
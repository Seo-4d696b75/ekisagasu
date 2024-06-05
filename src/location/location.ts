
export type CurrentLocationState = {
  type: 'idle'
} | {
  type: 'watch',
  /** 現在位置 */
  location: Location | null,
  /** 現在位置の更新時に地図の中心位置を自動で移動するかフラグ */
  autoScroll: boolean,
}

/**
 * Serializable location data similar with GeoLocationPosition
 */
export interface Location {
  position: LatLng,
  accuracy: number
  heading: number | null
}

export interface LatLng {
  lat: number
  lng: number
}

export interface MapCenter extends LatLng {
  zoom: number
}

export function isLatLng(value: any): value is LatLng {
  return value.lat !== undefined && typeof value.lat === 'number' &&
    value.lng !== undefined && typeof value.lng === 'number'
}

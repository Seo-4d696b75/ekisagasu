
/**
 * Serializable location data similar with GeoLocationPosition
 */
 export interface CurrentLocation {
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

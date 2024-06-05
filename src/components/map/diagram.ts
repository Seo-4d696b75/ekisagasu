import { isLatLng, LatLng, MapCenter } from "../../location"
import { Station } from "../../station"

export interface RectBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface PolylineProps {
  points: LatLng[]
  start: string
  end: string
}

export function getZoomProperty(
  bounds: RectBounds,
  width: number,
  height: number,
  min_zoom: number = 0,
  anchor: LatLng | null = null,
  margin: number = 50,
): MapCenter {
  let center = {
    lat: (bounds.south + bounds.north) / 2,
    lng: (bounds.east + bounds.west) / 2
  };
  let zoom = Math.floor(Math.log2(Math.min(
    360 / (bounds.north - bounds.south) * height / 256 * Math.cos(center.lat * Math.PI / 180),
    360 / (bounds.east - bounds.west) * width / 256
  )));
  if (zoom < min_zoom) {
    zoom = min_zoom;
    if (anchor) {
      let max_lng = 360 * (width - margin * 2) / 256 * Math.cos(center.lat * Math.PI / 180) / Math.pow(2, zoom);
      let max_lat = 360 * (height - margin * 2) / 256 / Math.pow(2, zoom);
      if (Math.abs(center.lng - anchor.lng) > max_lng / 2) {
        center.lng = anchor.lng + max_lng / 2 * (center.lng > anchor.lng ? 1 : -1);
      }
      if (Math.abs(center.lat - anchor.lat) > max_lat / 2) {
        center.lat = anchor.lat + max_lat / 2 * (center.lat > anchor.lat ? 1 : -1);
      }
    }
  }
  return { ...center, zoom: zoom };
}

export function getBounds(list: Array<LatLng | Station>): RectBounds {
  let points = list.map(s => {
    if (isLatLng(s)) {
      return s;
    } else {
      return s.position;
    }
  });
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  for (let p of points) {
    north = Math.max(north, p.lat);
    south = Math.min(south, p.lat);
    east = Math.max(east, p.lng);
    west = Math.min(west, p.lng);
  }
  return {
    north: north,
    south: south,
    east: east,
    west: west,
  };
}

export function parseQueryBoolean(value: any): boolean {
  return typeof value === 'string' && ['true', 'yes', '1'].includes(value.trim().toLowerCase())
}

export function isInsideRect(position: LatLng | RectBounds, rect: RectBounds): boolean {
  if (isLatLng(position)) {
    return (
      position.lat >= rect.south &&
      position.lat <= rect.north &&
      position.lng >= rect.west &&
      position.lng <= rect.east
    )
  } else {
    return (
      position.south >= rect.south
      && position.north <= rect.north
      && position.east <= rect.east
      && position.west >= rect.west
    )
  }
}

/**
 * 地球を真球と仮定して大円距離を測定する
 * @param pos1 
 * @param pos2 
 * @returns 単位 meter
 */
export function measure(pos1: LatLng, pos2: LatLng): number {
  let lng1 = Math.PI * pos1.lng / 180
  let lat1 = Math.PI * pos1.lat / 180
  let lng2 = Math.PI * pos2.lng / 180
  let lat2 = Math.PI * pos2.lat / 180
  let lng = (lng1 - lng2) / 2
  let lat = (lat1 - lat2) / 2
  return 6378137.0 * 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(lat), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(lng), 2)))
}

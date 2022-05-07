import { isLatLng, LatLng } from "./location"
import { Station } from "./station"

export interface ZoomProps {
  center: LatLng
  zoom: number
}

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

export function getZoomProperty(bounds: RectBounds, width: number, height: number, min_zoom: number = 0, anchor: LatLng | null = null, margin: number = 50): ZoomProps {
  var center = {
    lat: (bounds.south + bounds.north) / 2,
    lng: (bounds.east + bounds.west) / 2
  };
  var zoom = Math.floor(Math.log2(Math.min(
    360 / (bounds.north - bounds.south) * width / 256 * Math.cos(center.lat * Math.PI / 180),
    360 / (bounds.east - bounds.west) * height / 256
  )));
  if (zoom < min_zoom) {
    zoom = min_zoom;
    if (anchor) {
      var max_lng = 360 * (width - margin * 2) / 256 * Math.cos(center.lat * Math.PI / 180) / Math.pow(2, zoom);
      var max_lat = 360 * (height - margin * 2) / 256 / Math.pow(2, zoom);
      if (Math.abs(center.lng - anchor.lng) > max_lng / 2) {
        center.lng = anchor.lng + max_lng / 2 * (center.lng > anchor.lng ? 1 : -1);
      }
      if (Math.abs(center.lat - anchor.lat) > max_lat / 2) {
        center.lat = anchor.lat + max_lat / 2 * (center.lat > anchor.lat ? 1 : -1);
      }
    }
  }
  return { center: center, zoom: zoom };
}

export function getBounds(list: Array<LatLng | Station>): RectBounds {
  var points = list.map(s => {
    if (isLatLng(s)) {
      return s;
    } else {
      return s.position;
    }
  });
  var north = -90;
  var south = 90;
  var east = -180;
  var west = 180;
  for (var p of points) {
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

export function parseQueryBoolean(str: string): boolean {
  return ['true', 'yes', '1'].includes(str)
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
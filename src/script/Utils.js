
export function get_zoom_property(bounds, width, height, min_zoom = 0, anchor = undefined, margin = 50) {
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
  return [center, zoom];
}

/**
 * 
 * @param {[{lat:Number, lng:Number}]} list 
 */
export function get_bounds(list) {
  var points = list.map(s => {
    if (s.lat && s.lng) {
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
    points: points,
    north: north,
    south: south,
    east: east,
    west: west,
  };
}

export function parse_polyline(data){
  var start = data['start'];
  var end = data['end'];
  const scale = 100000.0;
  var lng = Math.round(data['lng'] * scale);
  var lat = Math.round(data['lat'] * scale);
  var deltaX = data['delta_lng'];
  var deltaY = data['delta_lat'];
  var points = deltaX.map((dx, i) => {
    var dy = deltaY[i];
    lng += dx;
    lat += dy;
    return {
      lat: lat / scale,
      lng: lng / scale,
    };
  });
  return {
    start: start,
    end: end,
    points: points,
  };
}


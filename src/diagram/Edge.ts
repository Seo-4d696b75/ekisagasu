import * as line from "./Line";
import * as point from "./Point";
import { Point, Line, Edge, DiagramError } from "./types"

export function toString(e: Edge) {
  return `{${point.toString(e.a)}-${point.toString(e.b)}}`
}

export function isEdge(p: any): p is Edge {
  return p !== null &&
    typeof p === "object" &&
    point.isPoint(p.a) &&
    point.isPoint(p.b)

}

class EdgeError extends DiagramError { }

class EdgeInitError extends DiagramError {
  constructor(p: Point) {
    super(`point duplicated: ${point.toString(p)}`)
  }
}

export function init(a: Point, b: Point): Edge {
  if (a.x < b.x) {
    return { a: a, b: b };
  } else if (a.x > b.x) {
    return { a: b, b: a };
  } else {
    if (a.y < b.y) {
      return { a: a, b: b };
    } else if (a.y > b.y) {
      return { a: b, b: a };
    } else {
      throw new EdgeInitError(a)
    }
  }
}

export function toLine(edge: Edge): Line {
  return line.init(edge.a, edge.b);
}

export function equals(self: Edge, other: Edge): boolean {
  return point.equals(self.a, other.a) && point.equals(self.b, other.b);
}

export function hashCode(edge: Edge): number {
  var hash = 17;
  hash = 31 * hash + point.hashCode(edge.a);
  hash = 31 * hash + point.hashCode(edge.b);
  return hash & hash;
}

export function getMiddlepoint(edge: Edge): Point {
  return {
    x: (edge.a.x + edge.b.x) / 2,
    y: (edge.a.y + edge.b.y) / 2,
  };
}

export function onEdge(p1: Edge | Point, p2: Point, p3?: Point): boolean {
  if (isEdge(p1)) {
    p3 = p2
    var edge = p1
    p1 = edge.a
    p2 = edge.b
  }
  if (p3) {
    var start: Point = p1
    var end: Point = p2
    var p: Point = p3
    if ((start.x - p.x) * (end.x - p.x) + (start.y - p.y) * (end.y - p.y) <= 0) {
      return line.onLine(start, end, p);
    } else {
      return false;
    }
  }
  throw new EdgeError("invalid arguments")
}

export function getDivision(edge: Edge, index: number): Point {
  return point.getDivision(edge.a, edge.b, index);
}

/**
 * 交点を取得する
 * @param {edge} edge 
 * @param {edge/line} other 
 * @return null if no such point
 */
export function getIntersection(edge: Edge, other: Edge | Line): Point | null {
  if (line.isLine(other)) {
    var p = line.getIntersection(toLine(edge), other);
    if (p) {
      var v = (edge.a.x - p.x) * (edge.b.x - p.x) + (edge.a.y - p.y) * (edge.b.y - p.y);
      return v <= 0 ? p : null;
    }
    return null
  } else {
    p = getIntersection(edge, toLine(other));
    if (p) {
      v = (other.a.x - p.x) * (other.b.x - p.x) + (other.a.y - p.y) * (other.b.y - p.y);
      if (v <= 0) return p;
    }
    return null;
  }
}

export function getDistance(edge: Edge, p: Point): number {
  var v1 = (p.x - edge.a.x) * (edge.b.x - edge.a.x) + (p.y - edge.a.y) * (edge.b.y - edge.a.y);
  var v2 = (p.x - edge.b.x) * (edge.a.x - edge.b.x) + (p.y - edge.b.y) * (edge.a.y - edge.b.y);
  if (v1 > 0 && v2 > 0) {
    return line.getDistance(toLine(edge), p);
  } else if (v1 <= 0) {
    return point.measure(edge.a, p);
  } else {
    return point.measure(edge.b, p);
  }
}
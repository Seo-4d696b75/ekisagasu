import * as edge from "./edge"
import * as point from "./point"
import { DiagramError, Edge, Line, Point } from "./types"

class LineInitError extends DiagramError { }

class LineError extends DiagramError {
  constructor(mes: string, line?: Line) {
    super(line ? `${mes} line:${toString(line)}` : mes)
  }
}

export function toString(line: Line): string {
  return `{ax+by+c=0 with a:${line.a},b:${line.b},c:${line.c}}`
}

export function isLine(p: any): p is Line {
  return p !== null &&
    typeof p === "object" &&
    typeof p.a === "number" &&
    typeof p.b === "number" &&
    typeof p.c === "number"
}

/**
 * Gets an instance of a new line. Pairs of arguments are; 
 * (1) a, b, c: number => a line defined by equation: ax + by + c = 0
 * (2) a, b: Point => a line which goes through the both points
 * @param a 
 * @param b 
 * @param c 
 */
export function init(a: number | Point, b: number | Point, c?: number): Line {
  if (typeof a === "number" && typeof b === "number") {
    if (typeof c === "number") {
      if (b === 0) {
        if (a === 0) {
          throw new LineInitError("a = b = 0")
        }
        return {
          a: 1.0,
          b: 0.0,
          c: c / a,
        };
      } else {
        return {
          a: a / b,
          b: 1.0,
          c: c / b,
        };
      }
    } else {
      return {
        a: -a,
        b: 1.0,
        c: -b,
      };
    }
  } else if (point.isPoint(a) && point.isPoint(b)) {
    if (point.equals(a, b)) {
      throw new LineInitError(`duplicated point: ${point.toString(a)}`)
    } else if (a.x === b.x) {
      return {
        a: 1.0,
        b: 0.0,
        c: -(a.x + b.x) / 2,
      };
    } else {
      return {
        a: (b.y - a.y) / (a.x - b.x),
        b: 1.0,
        c: (b.x * a.y - a.x * b.y) / (a.x - b.x),
      };
    }
  }
  throw new LineInitError(`cannot get an instance with a:${a} b:${b} c:${c}`)
}

/**
 * Check if a point is located on the given line. 
 * (1) a: Line, b: Point => whether point 'b' is located on line 'a' 
 * (2) a: Point, b :Point, c: Point => whether point 'c' is located on a line connecting two points 'a' and 'b'
 * @param {line/point} a 
 * @param {point} b 
 * @param {point} c 
 */
export function onLine(a: Line | Point, b: Point, c?: Point): boolean {
  if (isLine(a) && point.isPoint(b)) {
    var line = a;
    var p = b;
    return Math.abs(line.a * p.x + line.b * p.y + line.c) === 0;
  }
  if (point.isPoint(a) && point.isPoint(b) && point.isPoint(c)) {
    var v = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    return v === 0;
  }
  throw new LineError("invalid arguments")
}

export function equals(l1: Line, l2: Line): boolean {
  return l1.a === l2.a && l1.b === l2.b && l1.c === l2.c;
}

export function getIntersection(l1: Line, l2: Line | Edge): Point | null {
  if (edge.isEdge(l2)) {
    // l1:Line l2:edge
    var line = l1;
    var e = l2;
    if ((line.a * e.a.x + line.b * e.a.y + line.c) * (line.a * e.b.x + line.b * e.b.y + line.c) <= 0) {
      l2 = edge.toLine(e);
    } else {
      return null;
    }
  }
  // l1:Line l2:Line
  var det = l1.a * l2.b - l2.a * l1.b;
  if (det === 0) {
    return null;
  } else {
    var x = (l1.b * l2.c - l2.b * l1.c) / det
    var y = (l2.a * l1.c - l1.a * l2.c) / det
    // 線分が完全にx,y軸平行な場合でも浮動小数点演算の結果が微妙にズレる
    if (l1.b === 0) x = -l1.c
    if (l2.b === 0) x = -l2.c
    if (l1.a === 0) y = -l1.c
    if (l2.a === 0) y = -l2.c
    return { x: x, y: y }
  }
}

export function getPerpendicularBisector(p1: Point | Edge, p2?: Point): Line {
  if (edge.isEdge(p1)) {
    // p1:edge p2:null
    var e = p1;
    p1 = e.a;
    p2 = e.b;
  }
  if (p2) {

    // p1,p2:Point
    return {
      a: p1.x - p2.x,
      b: p1.y - p2.y,
      c: (-Math.pow(p1.x, 2) - Math.pow(p1.y, 2) + Math.pow(p2.x, 2) + Math.pow(p2.y, 2)) / 2,
    }
  }
  throw new LineError(`invalid arguments p1:${p1},p2:${p2}`)
}

export function getDistance(line: Line, point: Point): number {
  return Math.abs(point.x * line.a + point.y * line.b + line.c) / Math.sqrt(line.a * line.a + line.b * line.b);
}

export function onSameSide(line: Line, p1: Point, p2: Point): boolean {
  var v1 = line.a * p1.x + line.b * p1.y + line.c;
  var v2 = line.a * p2.x + line.b * p2.y + line.c;
  return v1 * v2 >= 0;
}

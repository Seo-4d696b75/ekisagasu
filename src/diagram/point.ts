import { stringHash } from "./utils"
import { Point, DiagramError } from "./types"

export const ZERO: Point = init(0, 0)

class PointInitError extends DiagramError {
  constructor(x: number, y: number) {
    super(`cannot get an instance with x:${x} y:${y}`)
  }
}

export function toString(p: Point, digit?: number) {
  if (digit && Number.isInteger(digit) && digit > 0) {
    return `(${p.x.toFixed(digit)},${p.y.toFixed(digit)})`
  }
  return `(${p.x},${p.y})`
}

export function isPoint(p: any): p is Point {
  return p !== null && typeof p === "object" && typeof p.x === "number" && typeof p.y === "number"
}

export function init(x: number, y: number): Point {
  if (Number.isFinite(x) && Number.isFinite(y)) {
    return {
      x: x,
      y: y
    }
  }
  throw new PointInitError(x, y)
}

export function equals(p1: Point, p2: Point): boolean {
  return p1.x === p2.x && p1.y === p2.y
}

export function hashCode(point: Point): number {
  var str = `${point.x.toString()},${point.y.toString}`
  return stringHash(str)
}

export function getDivision(p1: Point, p2: Point, index: number): Point {
  return {
    x: p1.x * (1.0 - index) + p2.x * index,
    y: p1.y * (1.0 - index) + p2.y * index,
  }
}

export function measure(p1: Point, p2: Point): number {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
  )
}

export function getMiddlePoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  }
}

export function compare(p1: Point, p2: Point): number {
  if (p1.x === p2.x) {
    if (p1.y === p2.y) {
      return 0
    } else if (p1.y < p2.y) {
      return -1
    } else {
      return 1
    }
  } else if (p1.x < p2.x) {
    return -1
  } else {
    return 1
  }
}
import * as point from "./point"
import { Point, Circle, DiagramError } from "./types"

export class CircleError extends DiagramError { }

export function init(center: Point, radius: number): Circle {
  if (Number.isFinite(radius) && radius > 0) {

    return {
      center: center,
      radius: radius,
    }
  }
  throw new CircleError(`invalid radius: ${radius}`)
}

export function containsPoint(circle: Circle, p: Point): boolean {
  return point.measure(p, circle.center) < circle.radius;
}

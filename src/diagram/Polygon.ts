import { Point, Edge, DiagramError } from "./types"
import * as point from "./Point"
import { ObjectSet } from "./utils"
import * as edge from "./Edge"

class EdgeGroup {

  constructor(e: Edge) {
    this.list = [e.a, e.b]
    this.p1 = e.a
    this.p2 = e.b

  }

  list: Array<Point>
  p1: Point
  p2: Point

  closed(): boolean {
    return point.equals(this.p1, this.p2)
  }

  merge(group: EdgeGroup): boolean {
    if (point.equals(this.p1, group.p1)) {
      var reverse = group.list.slice(1, group.list.length).reverse()
      this.list = reverse.concat(this.list)
      this.p1 = group.p2
    } else if (point.equals(this.p1, group.p2)) {
      this.list = group.list.slice(0, group.list.length - 1).concat(this.list)
      this.p1 = group.p1
    } else if (point.equals(this.p2, group.p1)) {
      this.list = this.list.slice(0, this.list.length - 1).concat(group.list)
      this.p2 = group.p2
    } else if (point.equals(this.p2, group.p2)) {
      var tmp = group.list.slice(0, group.list.length - 1).reverse()
      this.list = this.list.concat(tmp)
      this.p2 = group.p1
    } else {
      return false
    }
    return true
  }

}

export class Builder {


  constructor() {
    this.closed = false
    this.groups = []
    this.edges = new ObjectSet(edge.equals, edge.hashCode)
  }

  closed: boolean
  groups: Array<EdgeGroup>
  edges: ObjectSet<Edge>

  append(e: Edge): void {
    if (this.closed) {
      throw new DiagramError("Polygon already closed.")
    }
    if (!this.edges.add(e)) return

    var group = new EdgeGroup(e)
    this.groups = this.groups.filter(g => !group.merge(g))
    this.groups.push(group)
    this.closed = this.groups.length === 1 && group.closed()
  }

  isLine(): boolean {
    return this.groups.length === 1
  }

  getLine(): Array<Point> | null {
    if (this.isLine()) {
      return this.groups[0].list
    } else {
      return null
    }
  }

  build(): Array<Point> | null {
    if (this.closed) {
      var list = this.groups[0].list
      return Array.from(list)
    }
    return null
  }
}
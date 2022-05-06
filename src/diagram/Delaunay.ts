import { ObjectSet, ObjectMap } from "./utils"
import { Point, Edge, Line, Circle, Triangle, Rect, DiagramError } from "./types"
import * as point from "./Point"
import * as edge from "./Edge";
import * as triangle from "./Triangle"
import * as line from "./Line"
import * as circle from "./Circle"
import * as rect from "./Rect"
import { Builder as PolygonBuilder } from "./Polygon";


class TrianglePair {

  constructor(e: Edge, point1: Point, point2?: Point) {
    this.edge = e;
    this.p1 = point1;
    this.p2 = point2 ? point2 : null;
    this.t1 = triangle.init(e, point1);
    this.t2 = point2 ? triangle.init(e, point2) : null;
  }

  edge: Edge
  p1: Point
  t1: Triangle
  p2: Point | null
  t2: Triangle | null

  point(index: number): Point {
    if (index === 1) {
      return this.p1
    } else if (index === 2) {
      if (this.p2) return this.p2
      throw new DiagramError("triangle pair not solved yet")
    }
    throw new DiagramError("invalid arg")
  }

  triangle(index: number): Triangle {
    if (index === 1) {
      return this.t1
    } else if (index === 2) {
      if (this.t2) return this.t2
      throw new DiagramError("triangle pair not solved yet")
    }
    throw new DiagramError("invalid arg")
  }

  replace(change: Point) {
    if (!this.t2) {
      this.t2 = triangle.init(this.edge, change);
      return;
    }
    var apx = this.p1.x - this.edge.a.x;
    var apy = this.p1.y - this.edge.a.y;
    var bpx = this.p1.x - this.edge.b.x;
    var bpy = this.p1.y - this.edge.b.y;
    var aqx = change.x - this.edge.a.x;
    var aqy = change.y - this.edge.a.y;
    var bqx = change.x - this.edge.b.x;
    var bqy = change.y - this.edge.b.y;
    if ((apx * bpy - apy * bpx) * (aqx * bqy - aqy * bqx) > 0) {
      this.t1 = triangle.init(this.edge, change);
      this.p1 = change;
    } else {
      this.t2 = triangle.init(this.edge, change);
      this.p2 = change;
    }
  }

  isFlip(): boolean {
    return !!this.p2 &&
      circle.containsPoint(
        triangle.getCircumscribed(this.t1),
        this.p2
      );
  }

  flip(): void {
    if (this.p2 !== null) {
      var old = this.edge;
      this.edge = edge.init(this.p1, this.p2);
      this.p1 = old.a;
      this.p2 = old.b;
      this.t1 = triangle.init(this.edge, this.p1);
      this.t2 = triangle.init(this.edge, this.p2);
    }
  }

}

export class Delaunay {

  constructor(points: Array<Point>) {
    this.points = new ObjectSet(point.equals, point.hashCode, points)

    this.triangles = new ObjectSet(triangle.equals, triangle.hashCode);
    this.edges = [];
    this.trianglePairs = new ObjectMap(edge.equals, edge.hashCode);
  }

  points: ObjectSet<Point>

  triangles: ObjectSet<Triangle>
  edges: Array<Edge>
  trianglePairs: ObjectMap<Edge, TrianglePair>

  solvedTriangle?: ObjectSet<Triangle>
  solvedEdge?: ObjectSet<Edge>
  solvedPair?: ObjectMap<Edge, TrianglePair>

  split(boundary: Rect) {
    const time = performance.now();
    const container = rect.getContainer(boundary);
    this.triangles = new ObjectSet(triangle.equals, triangle.hashCode);
    this.edges = [];
    this.trianglePairs = new ObjectMap(edge.equals, edge.hashCode);
    this.triangles.add(container);
    var ab = edge.init(container.a, container.b);
    var bc = edge.init(container.b, container.c);
    var ca = edge.init(container.c, container.a);
    this.trianglePairs.put(ab, new TrianglePair(ab, container.c));
    this.trianglePairs.put(bc, new TrianglePair(bc, container.a));
    this.trianglePairs.put(ca, new TrianglePair(ca, container.b));
    console.log("calculate delaunay diagram");
    const progress = {
      percent: "0.00"
    };
    console.log("progress", progress);
    var size = this.points.size();
    var cnt = 0;
    for (let point of this.points) {
      var t = this.getContainer(point);
      if (!t) {
        throw new DiagramError("point outside border rect.");
      }
      this.addPoint(point, t);
      cnt++;
      progress.percent = (cnt * 100 / size).toPrecision(2);
    }
    const builder = new PolygonBuilder();
    this.triangles = this.triangles.removeIf(element => this.isOutSide(element, container, builder));
    if (!builder.closed) throw new Error("fail to calcuate frame");
    var list = builder.build();
    if (!list) throw new DiagramError("fail to build polyline of out-line")
    this.normalizeDirection(list);
    const length = list.length;

    var previous = list[length - 1];
    for (let i = 0; i < length; i++) {
      var current = list[i];
      var next = list[(i + 1) % length];
      var cross = (current.x - previous.x) * (next.y - current.y)
        - (current.y - previous.y) * (next.x - current.x);
      if (cross > 0) {
        previous = current;
      } else {
        this.addPointOutside(previous, current, next);
      }
    }

    this.solvedTriangle = this.triangles;
    this.solvedEdge = new ObjectSet(edge.equals, edge.hashCode);
    for (let item of this.solvedTriangle) {
      this.solvedEdge.add(edge.init(item.a, item.b));
      this.solvedEdge.add(edge.init(item.b, item.c));
      this.solvedEdge.add(edge.init(item.c, item.a));
    }

    this.solvedPair = new ObjectMap(edge.equals, edge.hashCode);
    for (let edge of this.solvedEdge) {
      var pair = this.trianglePairs.get(edge);
      if (!pair) throw new DiagramError("No pair found.");
      this.solvedPair.put(edge, pair);
    }


    console.log(`time: ${performance.now() - time}ms`);
  }

  isOutSide(next: Triangle, container: Triangle, builer: PolygonBuilder): boolean {
    var a = triangle.isVertex(next, container.a);
    var b = triangle.isVertex(next, container.b);
    var c = triangle.isVertex(next, container.c);
    var cnt = 0;
    if (a) cnt++;
    if (b) cnt++;
    if (c) cnt++;
    if (cnt === 1) {
      if (a) builer.append(triangle.getOppositeSide(next, container.a));
      if (b) builer.append(triangle.getOppositeSide(next, container.b));
      if (c) builer.append(triangle.getOppositeSide(next, container.c));
      return true;
    } else if (cnt === 2) {
      return true;
    } else {
      return false;
    }
  }

  normalizeDirection(list: Array<Point>): void {
    const length = list.length;
    var sum = 0;
    for (let i = 0; i < length; i++) {
      var previous = list[(i + length - 1) % length];
      var current = list[i];
      var next = list[(i + 1) % length];

      var ax = current.x - previous.x;
      var ay = current.y - previous.y;
      var bx = next.x - current.x;
      var by = next.y - current.y;
      var cross = ax * by - ay * bx;
      // -PI < argument < PI
      var inner = ax * bx + ay * by;
      var argument = Math.atan(cross / inner);
      if (inner < 0) {
        // |argument| > PI/2
        if (argument < 0) {
          argument += Math.PI;
        } else {
          argument -= Math.PI;
        }
      }
      sum += argument;
    }
    if (sum < 0) {
      list.reverse();
    }
  }

  getContainer(p: Point): Triangle | null {
    if (this.triangles) {
      for (let item of this.triangles) {
        if (triangle.containsPoint(item, p)) return item;
      }
    }
    return null;
  }


  addPointOutside(a: Point, b: Point, c: Point): void {
    this.edges = [];

    var ab = edge.init(a, b);
    var bc = edge.init(b, c);
    var ac = edge.init(c, a);

    this.trianglePairs.getValue(ab).replace(c)
    this.trianglePairs.getValue(bc).replace(a)
    this.trianglePairs.put(ac, new TrianglePair(ac, b));
    this.triangles.add(triangle.init(a, b, c));

    this.edges.push(ab);
    this.edges.push(bc);

    this.resolveDelaunay();
  }

  resolveDelaunay(): void {
    while (this.edges.length > 0) {
      var e = this.edges.shift()
      if (!e) break
      var pair = this.trianglePairs.getValue(e);
      if (pair.isFlip()) {
        this.trianglePairs.remove(e)
        if (!this.triangles.remove(pair.triangle(1)) ||
          !this.triangles.remove(pair.triangle(2))) throw new Error("fail to delete");
        pair.flip();
        this.trianglePairs.put(pair.edge, pair);
        if (!this.triangles.add(pair.triangle(1)) ||
          !this.triangles.add(pair.triangle(2))) throw new Error("fail to add");
        var a1 = edge.init(pair.point(1), pair.edge.a);
        var b1 = edge.init(pair.point(1), pair.edge.b);
        var a2 = edge.init(pair.point(2), pair.edge.a);
        var b2 = edge.init(pair.point(2), pair.edge.b);
        this.edges.push(a1);
        this.edges.push(b1);
        this.edges.push(a2);
        this.edges.push(b2);
        this.trianglePairs.getValue(a1).replace(pair.edge.b);
        this.trianglePairs.getValue(b1).replace(pair.edge.a);
        this.trianglePairs.getValue(a2).replace(pair.edge.b);
        this.trianglePairs.getValue(b2).replace(pair.edge.a);
      }
    }
  }

  addPoint(p: Point, t: Triangle): void {
    this.edges = [];
    if (triangle.isVertex(t, p)) {
      return;
    } else if (edge.onEdge(t.a, t.b, p)) {
      this.addOnEdge(t.a, t.b, t.c, p);
    } else if (edge.onEdge(t.b, t.c, p)) {
      this.addOnEdge(t.b, t.c, t.a, p);
    } else if (edge.onEdge(t.c, t.a, p)) {
      this.addOnEdge(t.c, t.a, t.b, p);
    } else {
      this.addInTriangle(p, t);
    }
  }

  addInTriangle(p: Point, t: Triangle): void {
    if (!this.triangles.remove(t)) throw new Error("fail to remove");
    var ab = edge.init(t.a, t.b);
    var bc = edge.init(t.b, t.c);
    var ca = edge.init(t.c, t.a);

    this.trianglePairs.getValue(ab).replace(p);
    this.trianglePairs.getValue(bc).replace(p);
    this.trianglePairs.getValue(ca).replace(p);

    var pa = edge.init(t.a, p);
    var pb = edge.init(t.b, p);
    var pc = edge.init(t.c, p);
    var ta = new TrianglePair(pa, t.c, t.b);
    var tb = new TrianglePair(pb, t.a, t.c);
    var tc = new TrianglePair(pc, t.b, t.a);
    this.trianglePairs.put(pa, ta);
    this.trianglePairs.put(pb, tb);
    this.trianglePairs.put(pc, tc);
    if (!this.triangles.add(ta.triangle(1))
      || !this.triangles.add(tb.triangle(1))
      || !this.triangles.add(tc.triangle(1))) throw new Error("fail to add");

    this.edges.push(ab);
    this.edges.push(bc);
    this.edges.push(ca);

    this.resolveDelaunay();

  }

  addOnEdge(a: Point, b: Point, c: Point, p: Point) {
    var old = edge.init(a, b);
    var pair = this.trianglePairs.remove(old)
    if (!pair) throw new DiagramError("fail to find pair")
    var d = line.onSameSide(edge.toLine(old), pair.point(1), c) ? pair.point(2) : pair.point(1);

    this.triangles.remove(pair.triangle(1));
    this.triangles.remove(pair.triangle(2));
    var pc = edge.init(p, c);
    var pd = edge.init(p, d);
    var pa = edge.init(p, a);
    var pb = edge.init(p, b);
    var innerPair = new TrianglePair(pc, a, b);
    var outerPair = new TrianglePair(pd, a, b);
    this.triangles.add(innerPair.triangle(1));
    this.triangles.add(innerPair.triangle(2));
    this.triangles.add(outerPair.triangle(1));
    this.triangles.add(outerPair.triangle(2));
    this.trianglePairs.put(pc, innerPair);
    this.trianglePairs.put(pd, outerPair);
    this.trianglePairs.put(pa, new TrianglePair(pa, d, c));
    this.trianglePairs.put(pb, new TrianglePair(pb, d, c));

    var ac = edge.init(a, c);
    var bc = edge.init(b, c);
    var ad = edge.init(a, d);
    var bd = edge.init(b, d);
    this.trianglePairs.getValue(ac).replace(p);
    this.trianglePairs.getValue(bc).replace(p);
    this.trianglePairs.getValue(ad).replace(p);
    this.trianglePairs.getValue(bd).replace(p);
    this.edges.push(ac);
    this.edges.push(bc);
    this.edges.push(ad);
    this.edges.push(bd);

    this.resolveDelaunay();

  }

}
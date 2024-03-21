import { logger } from "../script/logger"
import * as line from "./line"
import * as point from "./point"
import * as triangle from "./triangle"
import { DiagramError, Edge, Line, Point, Triangle } from "./types"
import { ObjectSet } from "./utils"

class VoronoiError extends DiagramError {
  constructor(mes: string) {
    super(mes)
  }
}

function fail(mes: string): never {
  throw new VoronoiError(mes)
}

function assert(value: unknown, message: () => string): asserts value {
  if (value) return
  fail(message())
}

/**
 * 二等分線の交点の前後における次数の変化量
 */
type StepDirection = "up" | "zero" | "down"

function invert(step: StepDirection): StepDirection {
  switch (step) {
    case "up":
      return "down"
    case "down":
      return "up"
    case "zero":
      return "zero"
  }
}

const ERROR = Math.pow(2, -30)

/**
 * Point + 付加情報 のラッパー  
 * 二つの二等分線の交点においてBisectorオブジェクトどうしの接続をモデル化
 */
class Node<T extends Point> implements Point {

  constructor(p: Point, a: Intersection<T>, b: Intersection<T>) {
    this.x = p.x
    this.y = p.y
    this._p1 = a
    this._p2 = b
    var cnt = 0
    if (a.line.isBoundary) cnt++
    if (b.line.isBoundary) cnt++
    if (cnt === 0) {
      this.onBoundary = false
      this.index = -1
    } else if (cnt === 1) {
      this.onBoundary = true
      this.index = -1
    } else {
      this.onBoundary = false
      this.index = 0
    }
  }

  x: number
  y: number

  // 各二等分線上の交点
  _p1: Intersection<T> | null
  _p2: Intersection<T> | null

  get p1(): Intersection<T> {
    return this._p1 ? this._p1 : fail("no intersection")
  }


  get p2(): Intersection<T> {
    return this._p2 ? this._p2 : fail("no intersection")
  }

  index: number
  onBoundary: boolean

  /**
   * 辿ってきた辺とは異なる線分上の隣接頂点でかつ辺のボロノイ次数が同じになる方を返す.
   * @param previous from which you are traversing
   * @return Node
   */
  next(previous: Point) {
    const p1 = this.p1
    const p2 = this.p2
    if (p1.hasNext && point.equals(p1.next, previous)) {
      return this.calcNext(p1, p2, false, invert(p1.step))
    } else if (p1.hasPrevious && point.equals(p1.previous, previous)) {
      return this.calcNext(p1, p2, true, p1.step)
    } else if (p2.hasNext && point.equals(p2.next, previous)) {
      return this.calcNext(p2, p1, false, invert(p2.step))
    } else if (p2.hasPrevious && point.equals(p2.previous, previous)) {
      return this.calcNext(p2, p1, true, p2.step)
    } else {
      fail("next node not found.")
    }
  }

  calcNext(current: Intersection<T>, other: Intersection<T>, forward: boolean, step: StepDirection) {
    if (this.onBoundary && this.index > 0) {
      // 頂点がFrame境界線上（Vertexではない）でかつ
      // この頂点が解決済みなら無視して同じ境界線上のお隣さんへ辿る
      return forward ? current.next.node : current.previous.node
    } else {
      // 頂点がFrame内部なら step = Node.STEP_UP/DOWN　のいずれか
      // FrameのVertexに位置する場合は例外的に step = Node.STEP_ZERO
      return other.neighbor(invert(step)).node
    }
  }

  /**
   * 辿ってきた辺とは異なる線分上の隣接頂点のうちこの頂点から見てボロノイ次数が
   * 下がるまたは変化しない方を返す.<br>
   * この頂点がFrame内部なら必ず次数が下がる隣接頂点を返すが、
   * Frame境界線のVertexに相当する場合は例外的に次数変化0の方向の頂点を返す
   * @param previous 
   */
  nextDown(previous: Point): Node<T> {
    const target = this.p1.isNeighbor(previous)
      ? this.p2
      : this.p2.isNeighbor(previous)
        ? this.p1
        : fail("neighbor not found")
    if (target.hasNeighbor("down")) {
      return target.neighbor("down").node
    } else {
      return target.neighbor("zero").node
    }
  }

  nextUp(previous: Point): Node<T> | null {
    const [t1, t2] = this.p1.isNeighbor(previous)
      ? [this.p2, this.p1]
      : this.p2.isNeighbor(previous)
        ? [this.p1, this.p2]
        : fail("neighbor not found")
    if (t1.hasNeighbor("up")) {
      return t1.neighbor("up").node
    } else if (t2.hasNeighbor("up")) {
      return t2.neighbor("up").node
    } else {
      return null
    }
  }

  onSolved(level: number): void {
    this.p1.onSolved()
    this.p2.onSolved()
    if (this.index < 0) {
      if (this.p1.line.isBoundary || this.p2.line.isBoundary) {
        this.index = level
      } else {
        this.index = level + 0.5
      }
    } else if (Math.round(this.index) !== this.index) {
      assert(this.index + 0.5 === level, () => `index mismatch. current: ${level}, node: ${this.index}`)
    }
  }

  hasSolved(): boolean {
    return this.index >= 0
  }

  release() {
    this._p1 = null
    this._p2 = null
  }

}

/**
 * 各二等分線上において他の線分との交点をモデル化
 * 交点によって分割され線分の次数変化を調べる
 */
class Intersection<T extends Point> implements Point {

  constructor(intersection: Point, b: Bisector<T>, other?: Line, center?: Point) {
    this.line = b
    this.x = intersection.x
    this.y = intersection.y

    if (other && center) {

      let dx = b.line.b
      let dy = -b.line.a
      if (dx < 0 || (dx === 0 && dy < 0)) {
        dx *= -1
        dy *= -1
      }
      let p = {
        x: intersection.x + dx,
        y: intersection.y + dy
      }
      this.step = line.onSameSide(other, p, center) ? "down" : "up"
    } else {
      this.step = "zero"
    }
  }

  x: number
  y: number
  line: Bisector<T>
  step: StepDirection

  _previous: Intersection<T> | null | undefined = undefined
  _next: Intersection<T> | null | undefined = undefined
  index: number = 0

  _node: Node<T> | null = null

  get hasPrevious(): boolean {
    const p = this._previous
    assert(p !== undefined, () => "previous not init yet")
    return p !== null
  }

  get previous(): Intersection<T> {
    const p = this._previous
    assert(p !== undefined, () => "previous not init yet")
    assert(p, () => "no previous")
    return p
  }

  get hasNext(): boolean {
    const n = this._next
    assert(n !== undefined, () => "next not init yet")
    return n !== null
  }

  get next(): Intersection<T> {
    const n = this._next
    assert(n !== undefined, () => "next not init yet")
    assert(n, () => "no next")
    return n
  }

  get node(): Node<T> {
    const n = this._node
    assert(n, () => "no node")
    return n
  }

  set node(value: Node<T>) {
    assert(!this._node, () => "node already set")
    this._node = value
  }

  insert(previous: Intersection<T> | null, next: Intersection<T> | null, index: number): void {
    this._previous = previous
    this._next = next
    if (this._previous) {
      this._previous._next = this
    }
    if (this._next) {
      this._next._previous = this
      this._next.incrementIndex()
    }
    this.index = index
  }

  incrementIndex(): void {
    this.index++
    if (this._next) this._next.incrementIndex()
  }

  isNeighbor(p: Point): boolean {
    return (this.hasNext && point.equals(this.next, p))
      || (this.hasPrevious && point.equals(this.previous, p))
  }

  hasNeighbor(step: StepDirection): boolean {
    if (step === "zero" && this.step === "zero") {
      return true
    } else if (step !== "zero" && this.step !== "zero") {
      return (step === this.step) ? !!this._next : !!this._previous
    }
    return false
  }

  neighbor(step: StepDirection): Intersection<T> {
    if (step === "zero" && this.step === "zero") {
      if (this._previous) return this._previous
      if (this._next) return this._next
    } else if (step !== "zero" && this.step !== "zero") {
      return (step === this.step) ? this.next : this.previous
    }
    fail("neighbor step invalid.")
  }

  onSolved(): void {
    this.line.onIntersectionSolved(this)
  }

  release(): void {
    this._previous = null
    this._next = null
    if (this._node) {
      this._node.release()
      this._node = null
    }
  }
}

/**
 * ボロノイ分割を構成する二等分線を表現
 */
class Bisector<T extends Point> {

  constructor(bisector: Line, p?: T) {
    this.line = bisector
    this.intersections = []
    if (p) {
      this.delaunayPoint = p
      this.isBoundary = false
    } else {
      this.delaunayPoint = null
      this.isBoundary = true
    }
  }

  line: Line
  intersections: Array<Intersection<T>>
  isBoundary: boolean
  delaunayPoint: T | null

  solvedPointIndexFrom: number = Number.MAX_SAFE_INTEGER
  solvedPointIndexTo: number = -1

  /**
   * 
   * @param boundary
   */
  inspectBoundary(boundary: Edge): void {
    var p = line.getIntersection(this.line, boundary)
    if (p) {
      var i = new Intersection(p, this)
      this.addIntersection(i)
    }
  }

  onIntersectionSolved(intersection: Intersection<T>): void {
    var index = intersection.index
    this.solvedPointIndexFrom = Math.min(
      this.solvedPointIndexFrom,
      index
    )
    this.solvedPointIndexTo = Math.max(
      this.solvedPointIndexTo,
      index
    )
  }

  addIntersection(intersection: Intersection<T>): void {
    const size = this.intersections.length
    var index = this.addIntersectionAt(intersection, 0, size)
    intersection.insert(
      index > 0 ? this.intersections[index - 1] : null,
      index < size ? this.intersections[index] : null,
      index
    )
    this.intersections.splice(index, 0, intersection)
    if (this.solvedPointIndexFrom < this.solvedPointIndexTo) {
      if (index <= this.solvedPointIndexFrom) {
        this.solvedPointIndexFrom++
        this.solvedPointIndexTo++
      } else if (index <= this.solvedPointIndexTo) {
        fail("new intersection added to solved range.")
      }
    }
  }

  addIntersectionAt(p: Point, indexFrom: number, indexTo: number): number {
    if (indexFrom === indexTo) {
      return indexFrom
    } else {
      var mid = Math.floor((indexFrom + indexTo - 1) / 2)
      var r = point.compare(p, this.intersections[mid])
      if (r < 0) {
        return this.addIntersectionAt(p, indexFrom, mid)
      } else if (r > 0) {
        return this.addIntersectionAt(p, mid + 1, indexTo)
      } else {
        fail("same point already added in this bisector")
      }
    }
  }

  release(): void {
    this.intersections.forEach(i => i.release())
    this.intersections.splice(0, this.intersections.length)
  }

}

/** 
 * 母点集合において指定された点の隣接点を取得する
 */
export type PointProvider<T extends Point> = (p: T) => Promise<T[]>

/**
 * 各次数における計算結果のコールバック関数
 * @param index 次数（１始まりで数えた数字）
 * @param polygon ポリゴンを成す座標点を順にもつリスト
 */
export type Callback = (index: number, polygon: Point[]) => void

/**
 * 高次ボロノイ分割を計算する
 */
export class Voronoi<T extends Point> {

  /**
   * 
   * @param center 中心の母点
   * @param frame すべての母点を内包する三角形
   * @param provider 隣接点を取得する関数
   */
  constructor(center: T, frame: Triangle, provider: PointProvider<T>) {
    this.center = center
    this.container = frame
    this.provider = provider
  }

  container: Triangle
  provider: PointProvider<T>
  running: boolean = false

  /**
   * 高次ボロノイ分割を計算する
   * 
   * １次から指定された次数まで逐次的に計算する
   * @param level 計算する次数
   * @param callback 各次数でのボロノイ領域（ポリゴン）が計算されるたびにコールバックする
   * @return 1..indexまでの次数の順に計算されたポリゴンを格納したリスト
   */
  async execute(level: number, callback: Callback | null): Promise<Point[][]> {
    assert(!this.running, () => "already running")
    this.running = true

    // 初期化
    this.targetIndex = level
    this.time = performance.now()
    this.callback = callback
    this.bisectors = []
    this.addBoundary(line.init(this.container.a, this.container.b))
    this.addBoundary(line.init(this.container.b, this.container.c))
    this.addBoundary(line.init(this.container.c, this.container.a))

    this.delaunayPoints.clear()
    this.delaunayPoints.add(this.center)

    return this.searchPolygon(1, [])
  }

  center: T
  targetIndex: number = 1

  time: number = 0

  callback: Callback | null = null
  bisectors: Bisector<T>[] = []

  delaunayPoints = new ObjectSet<T>(point.equals, point.hashCode)

  private async searchPolygon(index: number, result: Node<T>[][]): Promise<Node<T>[][]> {
    const loopTime = performance.now()

    const previousPolygon = index === 1 ? null : result[result.length - 1]

    // ドロネー分割点を追加
    await this.expandDelaunayPoints(previousPolygon)

    // ボロノイ範囲の計算
    const polygon = this.traverse(previousPolygon)
    polygon.forEach(node => node.onSolved(index))

    logger.d(`execute index:${index} time:${performance.now() - loopTime}`)

    if (this.callback) {
      this.callback(index, polygon)
    }
    if (index < this.targetIndex) {
      return this.searchPolygon(
        index + 1,
        [...result, polygon],
      )
    } else {
      this.bisectors.forEach(b => b.release())
      logger.d(`execute done. time:${performance.now() - this.time}`)

      this.running = false

      return [...result, polygon]
    }

  }

  /**
   * 現在の字数のボロノイ範囲のポリゴンを計算する
   * @param previousPolygon 
   * @param tasks 
   * @returns ポリゴン
   */
  private traverse(previousPolygon: Node<T>[] | null): Node<T>[] {
    let [previous, next] = (() => {
      let next: Node<T> | null = null
      let previous: Node<T> | null = null
      if (!previousPolygon) {
        const history = new ObjectSet(point.equals, point.hashCode)
        const sample = this.bisectors[0]
        next = sample.intersections[1].node
        previous = sample.intersections[0].node
        while (history.add(next)) {
          const current: Node<T> = next
          next = current.nextDown(previous)
          previous = current
        }
        return [previous, next]
      } else {
        previous = previousPolygon[previousPolygon.length - 1]
        for (let n of previousPolygon) {
          next = n.nextUp(previous)
          previous = n
          if (next && !next.hasSolved()) return [previous, next]
        }
        fail("traverse start not found")
      }
    })()

    assert(next && previous && !next.hasSolved(), () => "fail to traverse polygon")

    const start = next
    const polygon = [start]
    while (true) {
      const current = next
      next = current.next(previous)
      previous = current

      if (point.equals(start, next)) break
      assert(polygon.every(p => !point.equals(p, next)), () => "point duplicated")
      polygon.push(next)
    }

    return polygon
  }

  /**
   * 隣接DelaunayPointを追加
   * @param polygon 
   */
  private async expandDelaunayPoints(polygon?: Node<T>[] | null) {
    const queue = polygon ? polygon.map(n => [n.p1.line.delaunayPoint, n.p2.line.delaunayPoint])
      .flat()
      .filter((n): n is T => !!n) : [this.center]
    for (let p of queue) {
      const neighbors = await this.provider(p)
      neighbors
        .filter(n => this.delaunayPoints.add(n))
        .forEach(n => this.addBisector(n))
    }
  }

  /**
   * 
   * @param {*} self Line 
   */
  private addBoundary(self: Line): void {
    const boundary = new Bisector<T>(self)
    this.bisectors.forEach(preexist => {
      const p = line.getIntersection(boundary.line, preexist.line)
      assert(p, () => "intersection not found")
      const a = new Intersection<T>(p, boundary)
      const b = new Intersection<T>(p, preexist)
      const n = new Node<T>(p, a, b)
      a.node = n
      b.node = n
      boundary.addIntersection(a)
      preexist.addIntersection(b)
    })
    this.bisectors.push(boundary)
  }

  private addBisector(intersection: T) {
    const bisector = new Bisector(
      line.getPerpendicularBisector(intersection, this.center),
      intersection
    )
    this.bisectors.forEach(preexist => {
      const p = line.getIntersection(bisector.line, preexist.line)
      if (p && triangle.containsPoint(this.container, p, ERROR)) {
        const a = new Intersection<T>(p, bisector, preexist.line, this.center)
        const b = new Intersection<T>(p, preexist, bisector.line, this.center)
        const n = new Node(p, a, b)
        a.node = n
        b.node = n
        bisector.addIntersection(a)
        preexist.addIntersection(b)
      }
    })
    this.bisectors.push(bisector)
  }
}

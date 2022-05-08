import { LatLng } from "./location"
import { Station } from "./station"
import { isInsideRect, RectBounds } from "./utils"

export interface StationNodeProps {
  code: number
  left?: number
  right?: number
  segment: undefined
}

export interface StationLeafNodeProps {
  code: number
  segment: string
}

/**
 * 探索木の部分木のデータ構造
 * [@see api docs](https://station-service.herokuapp.com/api/docs)
 */
export interface StationTreeSegmentProps {
  name: string
  root: number
  node_list: NodeProps[]
}

type NodeProps = StationNodeProps | StationLeafNodeProps

function isLeafNode(node: NodeProps): node is StationLeafNodeProps {
  return node.segment !== undefined
}

/**
 * 探索木の頂点
 * 
 * 各頂点がひとつのデータ点（駅とその座標）を保持する
 * ただし、分割された部分木で初期化されるため、
 * - 有効なデータを持つ頂点：即座に計算
 * - まだデータがない頂点：on-demandでデータを非同期にロードしてから計算
 */
class StationNode {

  depth: number
  code: number
  region: RectBounds

  constructor(depth: number, data: NodeProps, tree: StationKdTree, data_map: Map<number, NodeProps>, region: RectBounds) {
    this.depth = depth
    this.code = data.code
    this.region = region
    this.build(data, tree, data_map)
  }

  segmentName: string | null = null
  tree: StationKdTree | null = null

  station: Station | null = null
  left: StationNode | null = null
  right: StationNode | null = null

  build(data: NodeProps, tree: StationKdTree, dataMap: Map<number, NodeProps>) {
    if (isLeafNode(data)) {
      this.segmentName = data.segment
      this.tree = tree
      this.station = null
    } else {
      this.station = tree.stationProvider(this.code)
      if (!this.station) {
        console.error("station not found", this.code)
        return
      }
      if (!isInsideRect(this.station.position, this.region)) {
        console.error("station pos out of bounds", this.station, this.region)
        return
      }
      const x = (this.depth % 2 === 0)
      if (data.left) {
        const left = dataMap.get(data.left)
        if (!left) throw Error(`node not found ${data.left}`)
        const leftRegion = {
          north: x ? this.region.north : this.station.position.lat,
          south: this.region.south,
          east: x ? this.station.position.lng : this.region.east,
          west: this.region.west
        }
        this.left = new StationNode(this.depth + 1, left, tree, dataMap, leftRegion)
      }
      if (data.right) {
        const right = dataMap.get(data.right)
        if (!right) throw Error(`node not found ${data.right}`)
        const rightRegion = {
          north: this.region.north,
          south: x ? this.region.south : this.station.position.lat,
          east: this.region.east,
          west: x ? this.station.position.lng : this.region.west
        }
        this.right = new StationNode(this.depth + 1, right, tree, dataMap, rightRegion)
      }
    }
  }

  release() {
    this.tree = null
    this.station = null
    if (this.left) this.left.release()
    if (this.right) this.right.release()
    this.left = null
    this.right = null
  }

  async get(): Promise<Station> {
    if (!this.station) {
      if (!this.tree) throw Error("no tree assigned for initializing")
      if (!this.segmentName) throw Error("no segment-name not found")
      const tree = this.tree
      return tree.treeSegmentProvider(this.segmentName).then(data => {
        if (data.root !== this.code) {
          return Promise.reject(`root mismatch. name:${this.segmentName}`)
        } else {
          const map = new Map<number, NodeProps>()
          data.node_list.forEach(element => {
            map.set(element.code, element)
          })
          let rootNode = map.get(this.code)
          if (!rootNode) throw Error(`root node not found ${this.code}`)
          this.build(rootNode, tree, map)
          if (this.station) {
            return this.station
          } else {
            return Promise.reject(`fail to get station:${this.code}`)
          }
        }
      })
    } else {
      return Promise.resolve(this.station)
    }

  }

}

/**
 * 最近某探索の結果
 */
export interface NearStation {
  station: Station
  /**
   * 探索点からの距離[m]
   */
  dist: number
}

export type StationProvider = (code: number) => Station
export type TreeSegmentProvider = (name: string) => Promise<StationTreeSegmentProps>

/**
 * 駅座標に基づく最近某探索を高速に行うためのkd-treeデータ構造
 * 
 * **注意** 緯度・経度の値に基づく仮想的な直交座標系で計算されるユークリッド距離で大小を比較するため、
 * 実際の測地的距離（大円距離）の大小比較とは異なる結果となる
 */
export class StationKdTree {

  root: StationNode | null = null

  stationProvider: StationProvider
  treeSegmentProvider: TreeSegmentProvider

  constructor(stationProvider: StationProvider, treeSegmentProvider: TreeSegmentProvider) {
    this.stationProvider = stationProvider
    this.treeSegmentProvider = treeSegmentProvider
  }

  async initialize(root_name: string): Promise<StationKdTree> {
    return this.treeSegmentProvider(root_name).then(data => {
      const map = new Map<number, NodeProps>()
      data.node_list.forEach(element => {
        map.set(element.code, element)
      })
      let region = {
        north: 90,
        south: -90,
        east: 180,
        west: -180,
      }
      let rootNode = map.get(data.root)
      if (!rootNode) throw Error(`root node not found ${data.root}`)
      this.root = new StationNode(0, rootNode, this, map, region)
      console.log("Kd-tree initialized.", this)
      return this
    })
  }

  release() {
    if (this.root) {
      this.root.release()
      this.root = null
    }
  }

  lastPosition: LatLng | null = null
  currentStation: Station | null = null
  searchList: NearStation[] = []

  /**
   * 指定した座標の近傍探索. k, r による探索範囲はorで解釈
   * @param {*} position 探索の中心
   * @param {*} k 中心からk番目に近い近傍まで探索
   * @param {*} r 中心からの距離r以内の近傍まで探索
   * @returns {Promise} resolve -> 近い順にソートされた近傍の配列
   */
  async updateLocation(position: LatLng, k: number, r: number = 0): Promise<Station | null> {
    if (k < 1) {
      return Promise.reject(`invalid k:${k}`)
    } else if (!this.root) {
      return Promise.reject('tree root not initialized')
    } else if (this.searchList.length >= k && this.lastPosition && this.lastPosition.lat === position.lat && this.lastPosition.lng === position.lng) {
      console.log("update skip")
      return this.currentStation
    } else {
      const time = performance.now()
      this.searchList = []
      await this.search(this.root, position, k, r)
      this.currentStation = this.searchList[0].station
      this.lastPosition = position
      console.log(`update done. k=${k} r=${r} time=${performance.now() - time}ms size:${this.searchList.length}`)
      return this.currentStation
    }
  }

  async updateRectRegion(rect: RectBounds, max: number): Promise<Station[]> {
    if (!this.root) {
      return Promise.reject('tree root not initialized')
    } else {
      const time = performance.now()
      const dst: Station[] = []
      await this.searchRect(this.root, rect, dst, max)
      console.log(`update region done. time=${performance.now() - time}ms size:${dst.length}`)
      return dst
    }
  }

  getAllNearStations(): Station[] {
    return this.searchList.map(e => e.station)
  }

  getNearStations(size: number): Station[] {
    if (!this.searchList) return []
    if (size < 0) size = 0
    if (size > this.searchList.length) {
      console.warn("getNearStations size longer than actual", size, this.searchList.length)
      size = this.searchList.length
    }
    return this.searchList.slice(0, size).map(e => e.station)
  }

  measure(p1: LatLng, p2: LatLng): number {
    let lat = p1.lat - p2.lat
    let lng = p1.lng - p2.lng
    return Math.sqrt(lat * lat + lng * lng)
  }

  async search(node: StationNode, position: LatLng, k: number, r: number) {
    const div: { value: number, threshold: number } = {
      value: 0,
      threshold: 0
    }

    const s = await node.get()
    const d = this.measure(position, s.position)
    let index = -1
    let size = this.searchList.length
    if (size > 0 && d < this.searchList[size - 1].dist) {
      index = size - 1
      while (index > 0) {
        if (d >= this.searchList[index - 1].dist) break
        index -= 1
      }
    } else if (size === 0) {
      index = 0
    }
    if (index >= 0) {
      let e = {
        dist: d,
        station: s
      }
      this.searchList.splice(index, 0, e)
      if (size >= k && this.searchList[size].dist > r) {
        this.searchList.pop()
      }
    }
    let x = (node.depth % 2 === 0)
    div.value = (x ? position.lng : position.lat)
    div.threshold = (x ? s.position.lng : s.position.lat)

    let next = (div.value < div.threshold) ? node.left : node.right
    if (next) {
      await this.search(next, position, k, r)
    }

    let value = div.value
    let th = div.threshold
    next = (value < th) ? node.right : node.left
    let list = this.searchList
    if (next && Math.abs(value - th) < Math.max(list[list.length - 1].dist, r)) {
      await this.search(next, position, k, r)
    }
  }

  async searchRect(node: StationNode, rect: RectBounds, dst: Station[], max: number): Promise<void> {
    const station = await node.get()
    if (max && dst.length >= max) {
      return
    }
    if (isInsideRect(station.position, rect)) {
      dst.push(station)
    }
    let tasks: Promise<void>[] = []
    // check left
    if (node.left && (
      (node.depth % 2 === 0 && rect.west < station.position.lng)
      || (node.depth % 2 === 1 && rect.south < station.position.lat)
    )) {
      tasks.push(this.searchRect(node.left, rect, dst, max))
    }
    // check right
    if (node.right && (
      (node.depth % 2 === 0 && station.position.lng < rect.east)
      || (node.depth % 2 === 1 && station.position.lat < rect.north)
    )) {
      tasks.push(this.searchRect(node.right, rect, dst, max))
    }
    await Promise.all(tasks)
  }
}
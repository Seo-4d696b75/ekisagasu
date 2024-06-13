import { isInsideRect, RectBounds } from "../components/map/diagram"
import { LatLng } from "../location"
import { logger } from "../logger"
import { Station } from "../station"

/**
 * kdTreeを構成する頂点
 */
export interface StationNode {
  depth: number
  region: RectBounds
  station: () => Promise<Station>
  left: () => StationNode | null
  right: () => StationNode | null
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

/**
 * 駅座標に基づく最近某探索を高速に行うためのkd-treeデータ構造
 * 
 * **注意** 緯度・経度の値に基づく仮想的な直交座標系で計算されるユークリッド距離で大小を比較するため、
 * 実際の測地的距離（大円距離）の大小比較とは異なる結果となる
 */
export class StationKdTree {

  root: StationNode

  constructor(root: StationNode) {
    this.root = root
  }

  /**
   * 指定した座標の近傍探索. k, r による探索範囲はorで解釈
   * @param {*} position 探索の中心
   * @param {*} k 中心からk番目に近い近傍まで探索
   * @param {*} r 中心からの距離r以内の近傍まで探索
   * @returns {Promise} resolve -> 近い順にソートされた近傍の配列
   */
  async search(position: LatLng, k: number, r: number = 0): Promise<NearStation[]> {
    if (k < 1) {
      return Promise.reject(`invalid k:${k}`)
    } else {
      const time = performance.now()
      const dst: NearStation[] = []
      await this._search(this.root, position, k, r, dst)
      logger.d(`update done. k=${k} r=${r} time=${performance.now() - time}ms size:${dst.length}`)
      return dst
    }
  }

  async searchRect(rect: RectBounds, max: number): Promise<Station[]> {
    const time = performance.now()
    const dst: Station[] = []
    await this._searchRect(this.root, rect, dst, max)
    logger.d(`update region done. time=${performance.now() - time}ms size:${dst.length}`)
    return dst
  }

  measure(p1: LatLng, p2: LatLng): number {
    let lat = p1.lat - p2.lat
    let lng = p1.lng - p2.lng
    return Math.sqrt(lat * lat + lng * lng)
  }

  async _search(node: StationNode, position: LatLng, k: number, r: number, dst: NearStation[]) {
    const div: { value: number, threshold: number } = {
      value: 0,
      threshold: 0
    }

    const s = await node.station()
    const d = this.measure(position, s.position)
    let index = -1
    let size = dst.length
    if (size > 0 && d < dst[size - 1].dist) {
      index = size - 1
      while (index > 0) {
        if (d >= dst[index - 1].dist) break
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
      dst.splice(index, 0, e)
      if (size >= k && dst[size].dist > r) {
        dst.pop()
      }
    }
    let x = (node.depth % 2 === 0)
    div.value = (x ? position.lng : position.lat)
    div.threshold = (x ? s.position.lng : s.position.lat)

    let next = (div.value < div.threshold) ? node.left() : node.right()
    if (next) {
      await this._search(next, position, k, r, dst)
    }

    let value = div.value
    let th = div.threshold
    next = (value < th) ? node.right() : node.left()
    if (next && Math.abs(value - th) < Math.max(dst[dst.length - 1].dist, r)) {
      await this._search(next, position, k, r, dst)
    }
  }

  async _searchRect(node: StationNode, rect: RectBounds, dst: Station[], max: number): Promise<void> {
    const station = await node.station()
    if (max && dst.length >= max) {
      return
    }
    if (isInsideRect(station.position, rect)) {
      dst.push(station)
    }
    let tasks: Promise<void>[] = []
    // check left
    const left = node.left()
    if (left && (
      (node.depth % 2 === 0 && rect.west < station.position.lng)
      || (node.depth % 2 === 1 && rect.south < station.position.lat)
    )) {
      tasks.push(this._searchRect(left, rect, dst, max))
    }
    // check right
    const right = node.right()
    if (right && (
      (node.depth % 2 === 0 && station.position.lng < rect.east)
      || (node.depth % 2 === 1 && station.position.lat < rect.north)
    )) {
      tasks.push(this._searchRect(right, rect, dst, max))
    }
    await Promise.all(tasks)
  }
}
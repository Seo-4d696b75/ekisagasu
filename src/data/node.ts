import { Station, StationAPIResponse } from "../data/station"
import { logger } from "../logger"
import { RectBounds, isInsideRect } from "../model/diagram"
import { StationNode } from "../search/kdTree"


/**
 * 探索木の部分木のデータ構造
 * [@see api docs](https://api.station.seo4d696b75.com/docs)
 */
export interface StationTreeSegmentResponse {
  name: string
  root: number
  node_list: StationNodeResponse[]
}

export type StationNodeResponse = NormalNodeResponse | SegmentNodeResponse

export type NormalNodeResponse = StationAPIResponse & {
  code: number
  left?: number
  right?: number
  segment: undefined
}

export interface SegmentNodeResponse {
  code: number
  segment: string
}

export function isSegmentNode(node: StationNodeResponse): node is SegmentNodeResponse {
  return node.segment !== undefined
}


export interface StationTreeProvider {
  station: (code: number) => Station
  segment: (name: string) => Promise<StationTreeSegmentResponse>
}

/**
 * 探索木の頂点
 * 
 * 各頂点がひとつのデータ点（駅とその座標）を保持する
 * ただし、分割された部分木で初期化されるため、
 * - 有効なデータを持つ頂点：即座に計算
 * - まだデータがない頂点：on-demandでデータを非同期にロードしてから計算
 */
export class StationNodeImpl implements StationNode {

  depth: number
  code: number
  region: RectBounds

  constructor(
    depth: number,
    data: StationNodeResponse,
    data_map: Map<number, StationNodeResponse>,
    provider: StationTreeProvider,
    region: RectBounds,
  ) {
    this.depth = depth
    this.code = data.code
    this.region = region
    this.build(data, data_map, provider)
  }

  segmentName: string | null = null
  provider: StationTreeProvider | null = null

  _station: Station | null = null
  _left: StationNodeImpl | null = null
  _right: StationNodeImpl | null = null

  build(
    data: StationNodeResponse,
    dataMap: Map<number, StationNodeResponse>,
    provider: StationTreeProvider,
  ) {
    if (isSegmentNode(data)) {
      this.segmentName = data.segment
      this.provider = provider
      this._station = null
    } else {
      this._station = provider.station(this.code)
      if (!this._station) {
        logger.e("station not found", this.code)
        return
      }
      if (!isInsideRect(this._station.position, this.region)) {
        logger.e("station pos out of bounds", this._station, this.region)
        return
      }
      const x = (this.depth % 2 === 0)
      if (data.left) {
        const left = dataMap.get(data.left)
        if (!left) throw Error(`node not found ${data.left}`)
        const leftRegion = {
          north: x ? this.region.north : this._station.position.lat,
          south: this.region.south,
          east: x ? this._station.position.lng : this.region.east,
          west: this.region.west
        }
        this._left = new StationNodeImpl(this.depth + 1, left, dataMap, provider, leftRegion)
      }
      if (data.right) {
        const right = dataMap.get(data.right)
        if (!right) throw Error(`node not found ${data.right}`)
        const rightRegion = {
          north: this.region.north,
          south: x ? this.region.south : this._station.position.lat,
          east: this.region.east,
          west: x ? this._station.position.lng : this.region.west
        }
        this._right = new StationNodeImpl(this.depth + 1, right, dataMap, provider, rightRegion)
      }
    }
  }

  release() {
    this._station = null
    if (this._left) this._left.release()
    if (this._right) this._right.release()
    this._left = null
    this._right = null
  }

  async station(): Promise<Station> {
    if (!this._station) {
      if (!this.provider) throw Error("no provider assigned for initializing")
      if (!this.segmentName) throw Error("no segment-name not found")

      const data = await this.provider.segment(this.segmentName)
      if (data.root !== this.code) {
        throw Error(`root mismatch. name:${this.segmentName}`)
      } else {
        const map = new Map<number, StationNodeResponse>()
        data.node_list.forEach(element => {
          map.set(element.code, element)
        })
        let rootNode = map.get(this.code)
        if (!rootNode) throw Error(`root node not found ${this.code}`)
        this.build(rootNode, map, this.provider)
        if (this._station) {
          return this._station
        } else {
          throw Error(`fail to get station:${this.code}`)
        }
      }
    } else {
      return this._station
    }
  }

  right(): StationNode | null {
    if (!this._station) throw Error("this node not initialized yet")
    return this._right
  }

  left(): StationNode | null {
    if (!this._station) throw Error("this node not initialized yet")
    return this._left
  }
}

export async function initRoot(provider: StationTreeProvider): Promise<StationNodeImpl> {
  const data = await provider.segment("root")
  const map = new Map<number, StationNodeResponse>()
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
  return new StationNodeImpl(0, rootNode, map, provider, region)
}

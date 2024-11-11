import axios, { AxiosResponse } from "axios"
import { RectBounds } from "../components/map/diagram"
import { LatLng } from "../location"
import { logger } from "../logger"
import { NearStation, StationKdTree } from "../search/kdTree"
import { Line, LineAPIResponse, LineDetailAPIResponse, PolylineAPIResponse, parseLine, parseLineDetail } from "./line"
import { StationNodeImpl, StationTreeSegmentResponse, initRoot, isSegmentNode } from "./node"
import { DelaunayStation, Station, StationAPIResponse, parseStation } from "./station"
import { getSynchronizer } from "./sync"

/**
 * データセットの種類
 */
export type DataType = "main" | "extra"

interface DataAPIOption {
  type: DataType
  baseURL: string
}

export class StationRepository {

  initialized: boolean = false

  dataAPI: DataAPIOption | null = null

  stations: Map<number, Station> = new Map()
  stationsId: Map<string, Station> = new Map()
  stationPoints: Map<number, DelaunayStation> | undefined = undefined
  lines: Map<number, Line> = new Map()
  linesId: Map<string, Line> = new Map()
  prefecture: Map<number, string> = new Map()

  root: StationNodeImpl | null = null
  tree: StationKdTree | null = null

  sync = getSynchronizer()

  onStationCleared: () => void
  onStationLoaded: (list: Station[]) => void

  constructor(
    onStationCleared: () => void,
    onStationLoaded: (list: Station[]) => void
  ) {
    this.onStationCleared = onStationCleared
    this.onStationLoaded = onStationLoaded

    // APIがコールドスタートのためWebApp起動時にウォームアップしておく
    this.get(`${import.meta.env.VITE_STATION_API_URL}/info`).then(info => {
      logger.i("station api data version:", info)
    }).catch(e => {
      logger.w("fail to warm-up api by calling /api/info", e)
    })
  }

  initialize(type: DataType): Promise<StationRepository> {
    // 複数呼び出しに対しても初期化処理をただ１回のみ実行する
    return this.sync('initialize', async () => {
      if (this.initialized) return this
      // load station and line
      await this.setData(type)

      // load prefecture
      this.prefecture.clear()
      let prefectureRes = await this.get<string>(`${this.dataAPI!.baseURL}/src/prefecture.csv`)
      this.prefecture = new Map()
      prefectureRes.data.split('\n').forEach((line: string) => {
        let cells = line.split(',')
        if (cells.length === 2) {
          this.prefecture.set(parseInt(cells[0]), cells[1])
        }
      })
      logger.d('station repository initialized', this)
      this.initialized = true
      return this
    })
  }

  /**
   * HTTP通信でデータ取得
   * @param url 
   * @returns 
   */
  get<T>(url: string): Promise<AxiosResponse<T>> {
    return this.sync(`axios-get:${url}`, () => axios.get<T>(url))
  }

  /**
   * アプリ内で表示するデータを切り替える
   * 
   * 駅・路線データを切り替える（他データはそのまま）
   * @param type 
   * @returns 
   */
  async setData(type: DataType): Promise<void> {
    return this.sync(`set-data:${type}`, async () => {
      if (this.dataAPI?.type === type) {
        // 連続呼び出しの対策
        return
      }

      // API接続先の初期化
      this.dataAPI = {
        type: type,
        baseURL: import.meta.env.VITE_DATA_BASE_URL,
      }

      // 内部情報の初期化
      this.release()

      // 地図上に表示している駅の初期化
      this.onStationCleared()

      // kdTree探索木の初期化
      this.root = await initRoot({
        station: this.getStationImmediate.bind(this),
        segment: this.getTreeSegment.bind(this),
      })
      this.tree = new StationKdTree(this.root)

      // 路線情報の初期化
      let lineRes = await this.get<LineAPIResponse[]>(`${this.dataAPI.baseURL}/out/${this.dataAPI.type}/line.json`)
      lineRes.data.forEach(d => {
        let line = parseLine(d)
        this.lines.set(line.code, line)
        this.linesId.set(line.id, line)
      })
    })
  }

  getStationImmediate(code: number): Station {
    return this.stations.get(code) as Station
  }

  async getStationById(id: string): Promise<Station> {
    return this.sync(`getStationById-${id}`, async () => {
      if (id.match(/^[0-9a-f]{6}$/)) {
        let s = this.stationsId.get(id)
        if (s) return s
        const res = await this.get<StationAPIResponse>(`${import.meta.env.VITE_STATION_API_URL}/station?id=${id}`)
        let pos = {
          lat: res.data.lat,
          lng: res.data.lng,
        }
        // this 'update' operation loads station data as a segment
        await this.search(pos, 1)
        return this.stationsId.get(id) as Station
      }
      const code = parseInt(id)
      if (!isNaN(code)) {
        return await this.getStation(code)
      }
      throw Error(`station not found. id:${id}`)
    })
  }

  async getStationOrNull(code: number): Promise<Station | undefined> {
    const s = this.stations.get(code)
    if (s) return s
    // step 1: get lat/lng of the target station
    // step 2: update neighbor stations
    return this.sync(`getStationOrNull-${code}`, async () => {
      try {
        const res = await this.get<StationAPIResponse>(`${import.meta.env.VITE_STATION_API_URL}/station?code=${code}`)
        let pos = {
          lat: res.data.lat,
          lng: res.data.lng,
        }
        // this 'update' operation loads station data as a segment
        await this.search(pos, 1)
        return this.getStationImmediate(code)
      } catch (e) {
        logger.w("api error. station code:", code, e)
        return undefined
      }
    })
  }

  async getStation(code: number): Promise<Station> {
    const s = await this.getStationOrNull(code)
    if (s) {
      return s
    } else {
      throw Error(`station not found code:${code}`)
    }
  }

  getLine(code: number): Line {
    return this.lines.get(code) as Line
  }

  getLineOrNull(code: number): Line | undefined {
    return this.lines.get(code)
  }

  getLineById(id: string): Line {
    if (id.match(/^[0-9a-f]{6}$/)) {
      let line = this.linesId.get(id)
      if (line) return line
    }
    const code = parseInt(id)
    if (!isNaN(code)) {
      return this.getLine(code)
    }
    throw Error(`line not found id:${id}`)
  }

  async getLineDetail(code: number): Promise<Line> {
    // 単一のupdate_** 呼び出しでも同一segmentが複数から要求される
    const tag = `getLineDetail-${code}`
    return await this.sync(tag, async () => {
      const line = this.lines.get(code)
      if (!line) {
        throw Error(`line not found id:${code}`)
      }
      if (line.detail) return line
      let res = await Promise.all([
        this.get<LineDetailAPIResponse>(`${this.dataAPI!.baseURL}/out/${this.dataAPI!.type}/line/${code}.json`),
        this.get<PolylineAPIResponse>(`${this.dataAPI!.baseURL}/out/${this.dataAPI!.type}/polyline/${code}.json`),
      ])
      let detail = parseLineDetail(res[0].data, res[1].data)
      let next: Line = {
        ...line,
        detail: detail
      }
      this.lines.set(code, next)
      return next
    })
  }

  getPrefecture(code: number): string {
    return this.prefecture.get(code) as string
  }

  getTreeSegment(name: string): Promise<StationTreeSegmentResponse> {
    const tag = `getTreeSegment-${name}`
    // be sure to avoid loading the same segment
    return this.sync(tag, async () => {
      const res = await this.get<StationTreeSegmentResponse>(`${this.dataAPI!.baseURL}/out/${this.dataAPI!.type}/tree/${name}.json`)
      logger.d("tree-segment loaded", name)
      const data = res.data
      const list = data.node_list.map(e => {
        return isSegmentNode(e) ? null : parseStation(e)
      }).filter((e): e is Station => e !== null)
      list.forEach(s => {
        this.stations.set(s.code, s)
        this.stationsId.set(s.id, s)
      })
      this.onStationLoaded(list)
      return data
    })
  }

  getStationPoint(code: number): Promise<DelaunayStation> {
    return this.sync("getStationPoint", async () => {
      let map = this.stationPoints
      if (!map) {
        const res = await this.get<DelaunayStation[]>(`${this.dataAPI!.baseURL}/out/${this.dataAPI!.type}/delaunay.json`)
        map = new Map()
        this.stationPoints = map
        res.data.forEach(d => {
          map?.set(d.code, d)
        })
      }
      const d = map?.get(code)
      if (d) {
        return d
      } else {
        throw Error(`delaunay station not found. code: ${code}`)
      }
    })
  }

  async search(position: LatLng, k: number): Promise<NearStation[]> {
    /* kd-tree のNodeデータは探索中に必要になって初めて非同期でロードされるため、
       同時に searchを呼び出すと前回の探索が終了する前に別の探索が走る場合があり得る
       KdTreeは内部状態を持つ実装のため挙動が予想できない
    */
    return this.sync(
      "kdTree",
      () => {
        if (!this.tree) throw Error('kdTree not initialized')
        return this.tree.search(position, k)
      },
    )
  }

  async searchRect(rect: RectBounds, max: number): Promise<Station[]> {
    return this.sync(
      "kdTree",
      () => {
        if (!this.tree) throw Error('kdTree not initialized')
        return this.tree.searchRect(rect, max)
      },
    )
  }

  release() {
    this.initialized = false
    this.stations.clear()
    this.stationsId.clear()
    this.lines.clear()
    this.linesId.clear()
    this.stationPoints = undefined
    this.root?.release()
    this.root = null
  }
}

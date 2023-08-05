import axios, { AxiosResponse } from "axios"
import { StationKdTree, StationLeafNodeProps, StationNodeProps } from "./kdTree"
import { Line, LineAPIResponse, LineDetailAPIResponse, parseLine, parseLineDetail } from "./line"
import { LatLng } from "./location"
import { DelaunayStation, Station, StationAPIResponse, parseStation } from "./station"
import { RectBounds } from "./utils"

const TAG_SEGMENT_PREFIX = "station-segment:"

type StationNodeResponse = StationAPIResponse & StationNodeProps

type StationLeafNodeResponse = StationLeafNodeProps

export function isStationLeafNode(node: StationNodeResponse | StationLeafNodeResponse): node is StationLeafNodeResponse {
  return node.segment !== undefined
}

export interface StationTreeSegmentResponse {
  name: string
  root: number
  station_size: number
  node_list: (StationNodeResponse | StationLeafNodeResponse)[]
}

enum ResultType {
  Success, Error,
}

type AsyncResult<T> = {
  type: ResultType.Success,
  value: T
} | {
  type: ResultType.Error,
  err?: any
}

export type DataType = "main" | "extra"
interface DataAPIOption {
  type: DataType
  baseURL: string
}

/**
 * 内部状態を持つデータ（UIに依存しない）を保持します
 * 
 * Reduxでの管理が難しいserialize不可なデータ構造を持ちます
 */
export class StationService {

  initialized = false
  positionOptions: PositionOptions = {
    timeout: 5000,
    maximumAge: 100,
    enableHighAccuracy: false,
  }
  navigatorId: number | null = null

  stations: Map<number, Station> = new Map()
  stationsId: Map<string, Station> = new Map()
  stationPoints: Map<number, DelaunayStation> | undefined = undefined
  lines: Map<number, Line> = new Map()
  linesId: Map<string, Line> = new Map()
  prefecture: Map<number, string> = new Map()

  tree: StationKdTree | null = null

  dataAPI: DataAPIOption | null = null

  constructor() {
    // APIがコールドスタートのためWebApp起動時にウォームアップしておく
    this.get(`${process.env.REACT_APP_STATION_API_URL}/info`).then(info => {
      console.log("station api data version:", info)
    }).catch(e => {
      console.warn("fail to warm-up api by calling /api/info", e)
    })
  }

  /**
   * 新しく読み込まれた駅一覧
   * 
   * update**関数による近傍点の探索で新しいtree-segmentをロードしたタイミングで呼ばれる
   */
  onStationLoadedCallback: ((list: Station[]) => void) | undefined = undefined

  /**
   * HTTP通信によるデータ取得時にコールバックされる
   * 
   * @param url 
   * @param promise HTTP通信の非同期処理 **必ずresolveされる**
   */
  dataLoadingCallback: ((url: string, promise: Promise<unknown>) => void) | undefined = undefined

  /**
   * 現在位置を監視している場合に変更された位置情報をコールバックする
   */
  onGeolocationPositionChangedCallback: ((pos: GeolocationPosition) => void) | undefined = undefined

  /**
   * いくつかの関数は外部API呼び出しを行うため非同期で実行される
   * 関数の呼び出しのタイミングによっては, 
   * - 重複してネットワークリソースを要求してまう
   * - 内部状態をもつ計算の順序が保証できない
   * このserviceで適切な同期をとる
   */
  tasks: Map<string, Promise<any>> = new Map()

  /**
   * tagで指定した非同期タスクの実行を同期する.
   * 
   * tagで識別される同種のタスクが並行して高々１つのみ実行されることを保証する
   * この関数呼び出し時に以前に実行を開始した別の非同期処理がまだ完了してない場合はその完了を待ってから実行する
   * 
   * @param tag 同期するタスクの種類の識別子
   * @param task 同期したいタスク asyncな関数・λ式を利用する.引数はこの関数の呼び出し時の状況に応じて,  
   *             - 該当する実行中の別タスクが存在する場合はその実行を待機してから実行
   *             - 該当する実行中の別タスクが存在しない場合は即座にtaskを実行
   * @returns task の実行結果
   */
  async runSync<T>(tag: string, task: () => Promise<T>): Promise<T> {
    const running = this.tasks.get(tag)
    const next: Promise<AsyncResult<T>> = (
      running?.then(() => {
        // 前段の処理を待機
        return task()
      }) ?? task()
    ).then(result => {
      return {
        type: ResultType.Success,
        value: result,
      }
    }).catch(err => {
      return {
        type: ResultType.Error,
        err: err,
      }
    })
    this.tasks.set(tag, next)
    // nextはrejectされない
    return next.then(result => {
      // 後処理
      if (Object.is(this.tasks.get(tag), next)) {
        this.tasks.delete(tag)
      }
      if (result.type === ResultType.Success) {
        return result.value
      } else {
        return Promise.reject(result.err)
      }
    })
  }

  /**
   * HTTP通信でデータ取得
   * @param url 
   * @returns 
   */
  async get<T>(url: string): Promise<AxiosResponse<T>> {
    const call = axios.get<T>(url)
    const safeCall = call.catch((e) => null)
    this.dataLoadingCallback?.(url, safeCall)
    return call
  }

  async initialize(type: DataType): Promise<StationService> {
    // 複数呼び出しに対しても初期化処理をただ１回のみ実行する
    return this.runSync("initialize", async () => {
      if (this.initialized) return this
      // load station and line
      await this.setData(type)

      // load prefecture
      this.prefecture.clear()
      let prefectureRes = await this.get<string>(process.env.REACT_APP_PREFECTURE_URL)
      this.prefecture = new Map()
      prefectureRes.data.split('\n').forEach((line: string) => {
        let cells = line.split(',')
        if (cells.length === 2) {
          this.prefecture.set(parseInt(cells[0]), cells[1])
        }
      })
      console.log('service initialized', this)
      this.initialized = true
      return this
    })
  }

  /**
   * アプリ内で表示するデータを切り替える
   * 
   * 駅・路線データを切り替える（他データはそのまま）
   * @param type 
   * @returns 
   */
  async setData(type: DataType): Promise<void> {
    return this.runSync('switch-data', async () => {
      if (this.dataAPI?.type === type) {
        // 連続呼び出しの対策
        return
      }
      this.dataAPI = {
        type: type,
        baseURL: type === "main" ? process.env.REACT_APP_DATA_BASE_URL : process.env.REACT_APP_DATA_EXTRA_BASE_URL,
      }
      this.stations.clear()
      this.lines.clear()
      this.stationsId.clear()
      this.stationPoints = undefined
      this.linesId.clear()
      this.tree = await new StationKdTree(
        this.getStationImmediate.bind(this),
        this.getTreeSegment.bind(this),
      ).initialize("root")
      let lineRes = await this.get<LineAPIResponse[]>(`${this.dataAPI.baseURL}/line.json`)
      lineRes.data.forEach(d => {
        let line = parseLine(d)
        this.lines.set(line.code, line)
        this.linesId.set(line.id, line)
      })
    })
  }

  release() {
    this.initialized = false
    this.tree?.release()
    this.tree = null
    this.stations.clear()
    this.stationsId.clear()
    this.lines.clear()
    this.linesId.clear()
    this.tasks.clear()
    this.setWatchCurrentPosition(false)
    this.onGeolocationPositionChangedCallback = undefined
    this.onStationLoadedCallback = undefined
    this.dataLoadingCallback = undefined
    console.log('service released')
  }

  setPositionHighAccuracy(value: boolean) {
    console.log("position accuracy changed", value)
    this.positionOptions.enableHighAccuracy = value
    if (this.navigatorId) {
      this.setWatchCurrentPosition(false)
      this.setWatchCurrentPosition(true)
    }
  }

  setWatchCurrentPosition(enable: boolean) {
    if (enable) {
      if (navigator.geolocation) {
        if (this.navigatorId) {
          console.log("already set")
          return
        }
        this.navigatorId = navigator.geolocation.watchPosition(
          (pos) => {
            this.onGeolocationPositionChangedCallback?.(pos)
          },
          (err) => {
            console.log(err)
          },
          this.positionOptions
        )
        console.log("start watching position", this.positionOptions)
      } else {
        console.log("this device does not support Geolocation")
      }
    } else {
      if (this.navigatorId) {
        navigator.geolocation.clearWatch(this.navigatorId)
        this.navigatorId = null
        console.log("stop watching position")
      }
    }
  }

  getCurrentPosition(): Promise<GeolocationPosition> {
    if (navigator.geolocation) {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve(pos)
          },
          (err) => {
            reject(err)
          },
          this.positionOptions
        )
      })
    } else {
      return Promise.reject("this device does not support Geolocation")
    }
  }

  async updateLocation(position: LatLng, k: number, r: number = 0): Promise<Station | null> {
    if (!k || k <= 0) k = 1
    if (!r || r < 0) r = 0
    /* kd-tree のNodeデータは探索中に必要になって初めて非同期でロードされるため、
       同時に update_**を呼び出すと前回の探索が終了する前に別の探索が走る場合があり得る
       KdTreeは内部状態を持つ実装のため挙動が予想できない
    */
    return await this.runSync("update_location", async () => {
      if (this.tree) {
        return this.tree.updateLocation(position, k, r)
      } else {
        return Promise.reject("tree not initialized")
      }
    })
  }

  async updateRect(rect: RectBounds, max: number = Number.MAX_SAFE_INTEGER): Promise<Station[]> {
    if (max < 1) max = 1
    return await this.runSync("update_location", async () => {
      if (this.tree) {
        return this.tree.updateRectRegion(rect, max)
      } else {
        return Promise.reject("tree not initialized")
      }
    })

  }

  getStationImmediate(code: number): Station {
    return this.stations.get(code) as Station
  }

  async getStationById(id: string): Promise<Station> {
    if (id.match(/^[0-9a-f]{6}$/)) {
      let s = this.stationsId.get(id)
      if (s) return s
      const res = await this.get<StationAPIResponse>(`${process.env.REACT_APP_STATION_API_URL}/station?id=${id}`)
      let pos = {
        lat: res.data.lat,
        lng: res.data.lng,
      }
      // this 'update' operation loads station data as a segment
      await this.updateLocation(pos, 1)
      return this.stationsId.get(id) as Station
    }
    const code = parseInt(id)
    if (!isNaN(code)) {
      return await this.getStation(code)
    }
    throw Error("invalid station arg, not id nor code.")
  }

  async getStationOrNull(code: number): Promise<Station | undefined> {
    const s = this.stations.get(code)
    if (s) return s
    // step 1: get lat/lng of the target station
    // step 2: update neighbor stations
    try {
      const res = await this.get<StationAPIResponse>(`${process.env.REACT_APP_STATION_API_URL}/station?code=${code}`)
      let pos = {
        lat: res.data.lat,
        lng: res.data.lng,
      }
      // this 'update' operation loads station data as a segment
      await this.updateLocation(pos, 1)
      return this.getStationImmediate(code)
    } catch (e) {
      console.warn("api error. station code:", code, e)
      return undefined
    }
  }

  async getStation(code: number): Promise<Station> {
    const s = await this.getStationOrNull(code)
    if (s) {
      return s
    } else {
      throw Error(`station not found code:${code}`)
    }
  }

  getStationPoint(code: number): Promise<DelaunayStation> {
    return this.runSync("get-delaunay-station", async () => {
      let map = this.stationPoints
      if (!map) {
        const res = await this.get<DelaunayStation[]>(`${this.dataAPI!.baseURL}/delaunay.json`)
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

  getLine(code: number): Line {
    return this.lines.get(code) as Line
  }

  getLineOrNull(code: number): Line | undefined {
    return this.lines.get(code)
  }

  getLineById(id: string): Line | undefined {
    if (id.match(/^[0-9a-f]{6}$/)) {
      let line = this.linesId.get(id)
      if (line) return line
    }
    const code = parseInt(id)
    if (!isNaN(code)) {
      return this.getLineOrNull(code)
    }
    return undefined
  }

  async getLineDetail(code: number): Promise<Line> {
    // 単一のupdate_** 呼び出しでも同一segmentが複数から要求される
    const tag = `line-details-${code}`
    return await this.runSync(tag, async () => {
      const line = this.lines.get(code)
      if (!line) {
        throw Error(`line not found id:${code}`)
      }
      if (line.detail) return line
      let res = await this.get<LineDetailAPIResponse>(`${this.dataAPI!.baseURL}/line/${code}.json`)
      let detail = parseLineDetail(res.data)
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
    const tag = `${TAG_SEGMENT_PREFIX}${name}`
    // be sure to avoid loading the same segment
    return this.runSync(tag, async () => {
      const res = await this.get<StationTreeSegmentResponse>(`${this.dataAPI!.baseURL}/tree/${name}.json`)
      console.log("tree-segment loaded", name)
      const data = res.data
      const list = data.node_list.map(e => {
        return isStationLeafNode(e) ? null : parseStation(e)
      }).filter((e): e is Station => e !== null)
      list.forEach(s => {
        this.stations.set(s.code, s)
        this.stationsId.set(s.id, s)
      })
      this.onStationLoadedCallback?.(list)
      return data
    })
  }
}

const service = new StationService()
export default service
import axios from "axios"
import { StationKdTree, StationLeafNodeProps, StationNodeProps } from "./kdTree"
import { Line, LineAPIResponse, LineDetailAPIResponse, parseLine, parseLineDetail } from "./line"
import { LatLng } from "./location"
import { parseStation, Station, StationAPIResponse } from "./station"
import { RectBounds } from "./utils"

const TAG_SEGMENT_PREFIX = "station-segment:"

type StationNodeResponse = StationAPIResponse & StationNodeProps

type StationLeafNodeResponse = StationLeafNodeProps

function isStationLeafNode(node: StationNodeResponse | StationLeafNodeResponse): node is StationLeafNodeResponse {
  return node.segment !== undefined
}

interface StationTreeSegmentResponse {
  name: string
  root: number
  station_size: number
  node_list: (StationNodeResponse | StationLeafNodeResponse)[]
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
  lines: Map<number, Line> = new Map()
  linesId: Map<string, Line> = new Map()
  prefecture: Map<number, string> = new Map()

  tree: StationKdTree | null = null

  /**
   * いくつかの関数は外部API呼び出しを行うため非同期で実行される
   * 関数の呼び出しのタイミングによっては, 
   * - 重複してネットワークリソースを要求してまう
   * - 内部状態をもつ計算の順序が保証できない
   * このserviceで適切な同期をとる
   */
  tasks: Map<string, Promise<any> | null> = new Map()

  taskId: number = 0

  /**
   * tagで指定した非同期タスクの実行を同期する.
   * 
   * tagで識別される同種のタスクが並行して高々１つのみ実行されることを保証する(実行順序は保証しない)
   * この関数呼び出し時に以前に実行を開始した別の非同期処理がまだ完了してない場合はその完了を待ってから実行する
   * 
   * @param tag 同期するタスクの種類の識別子
   * @param task 同期したいタスク asynな関数・λ式を利用する.引数はこの関数の呼び出し時の状況に応じて,  
   *             - 該当する実行中の別タスクが存在する場合はその実行を待機して別タスクの結果を渡して実行
   *             - 該当する実行中の別タスクが存在しない場合はnullを渡し即座にtaskを実行
   * @returns task の実行結果
   */
  async runSync<T>(tag: string, task: () => Promise<T>): Promise<T> {
    this.taskId += 1
    while (true) {
      const running = this.tasks.get(tag)
      if (running) {
        //console.log(`runSync(id:${id}) wait:`, tag)
        await running
      } else {
        //console.log(`runSync(id:${id}) wait: ${wait} run:`, tag)
        break
      }
    }
    const next = task().then(r => {
      this.tasks.set(tag, null)
      //console.log(`runSync(id:${id}) done:`, tag)
      return r
    }).catch(e => {
      this.tasks.set(tag, null)
      throw e
    })
    this.tasks.set(tag, next)
    return await next
  }

  async initialize(): Promise<StationService> {
    // 複数呼び出しに対しても初期化処理をただ１回のみ実行する
    return this.runSync("initialize", async () => {
      if (this.initialized) return this
      // clear collections
      this.stations.clear()
      this.lines.clear()
      this.stationsId.clear()
      this.linesId.clear()
      this.prefecture.clear()
      this.tree = await new StationKdTree(
        this.getStationImmediate.bind(this),
        this.getTreeSegment.bind(this),
      ).initialize("root")
      let lineRes = await axios.get<LineAPIResponse[]>(`${process.env.REACT_APP_DATA_BASE_URL}/line.json`)
      lineRes.data.forEach(d => {
        let line = parseLine(d)
        this.lines.set(line.code, line)
        this.linesId.set(line.id, line)
      })

      let prefectureRes = await axios.get<string>(process.env.REACT_APP_PREFECTURE_URL)
      this.prefecture = new Map()
      prefectureRes.data.split('\n').forEach((line: string) => {
        var cells = line.split(',')
        if (cells.length === 2) {
          this.prefecture.set(parseInt(cells[0]), cells[1])
        }
      })
      console.log('service initialized', this)
      this.initialized = true
      return this
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

  onGeolocationPositionChangedCallback: ((pos: GeolocationPosition) => void) | undefined = undefined

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
      const res = await axios.get<StationAPIResponse>(`${process.env.REACT_APP_STATION_API_URL}/station?id=${id}`)
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
    var s = this.stations.get(code)
    if (s) return s
    // step 1: get lat/lng of the target station
    // step 2: update neighbor stations
    try {
      const res = await axios.get<StationAPIResponse>(`${process.env.REACT_APP_STATION_API_URL}/station?code=${code}`)
      var pos = {
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
    var s = await this.getStationOrNull(code)
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

  getLineById(id: string): Line | undefined {
    if (id.match(/^[0-9a-f]{6}$/)) {
      var line = this.linesId.get(id)
      if (line) return line
    }
    const code = parseInt(id)
    if (!isNaN(code)) {
      return this.getLineOrNull(code)
    }
    return undefined
  }

  async getLineDetail(code: number): Promise<Line> {
    const line = this.lines.get(code)
    if (!line) {
      throw Error(`line not found id:${code}`)
    }
    // 単一のupdate_** 呼び出しでも同一segmentが複数から要求される
    const tag = `line-details-${code}`
    return await this.runSync(tag, async () => {
      if (line.detail) return line
      let res = await axios.get<LineDetailAPIResponse>(`${process.env.REACT_APP_DATA_BASE_URL}/line/${code}.json`)
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

  onStationLoadedCallback: ((list: Station[]) => void) | undefined = undefined

  getTreeSegment(name: string): Promise<StationTreeSegmentResponse> {
    const tag = `${TAG_SEGMENT_PREFIX}${name}`
    // be sure to avoid loading the same segment
    return this.runSync(tag, async () => {
      const res = await axios.get<StationTreeSegmentResponse>(`${process.env.REACT_APP_DATA_BASE_URL}/tree/${name}.json`)
      console.log("tree-segment", name, res.data)
      const data = res.data
      var list = data.node_list.map(e => {
        return isStationLeafNode(e) ? null : parseStation(e)
      }).filter((e): e is Station => e !== null)
      list.forEach(s => {
        this.stations.set(s.code, s)
        this.stationsId.set(s.id, s)
      })
      this.onStationLoadedCallback?.(list)
      this.tasks.set(tag, null)
      return data
    })
  }
}

const service = new StationService()
export default service
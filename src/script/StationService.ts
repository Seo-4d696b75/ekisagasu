import axios from "axios"
import { StationKdTree } from "./KdTree"
import { parseStation, Station, StationAPIResponse } from "./Station"
import { Line, LineAPIResponse, LineDetailAPIResponse, parseLine, parseLineDetail } from "./Line"
import * as Utils from "./Utils"
import * as actions from "./actions_"
import { store } from "./store_"

const TAG_SEGMENT_PREFIX = "station-segment:"

interface StationNodeResponse extends StationAPIResponse {
  left?: number
  right?: number
  segment: undefined
}

interface StationLeafNodeResponse {
  code: number
  segment: string
}

function isStationLeafNode(node: StationNodeResponse | StationLeafNodeResponse): node is StationLeafNodeResponse {
  return node.segment !== undefined
}

interface StationTreeSegmentResponse {
  name: string
  root: number
  station_size: number
  node_list: (StationNodeResponse | StationLeafNodeResponse)[]
}

export class StationService {

  initialized = false
  position_options: PositionOptions = {
    timeout: 5000,
    maximumAge: 100,
    enableHighAccuracy: false,
  }
  navigator_id: number | null = null

  stations: Map<number, Station> = new Map()
  stations_id: Map<string, Station> = new Map()
  lines: Map<number, Line> = new Map()
  lines_id: Map<string, Line> = new Map()
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

  task_id: number = 0

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
    this.task_id += 1
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
      this.stations_id.clear()
      this.lines_id.clear()
      this.prefecture.clear()
      this.tree = await new StationKdTree(this).initialize("root")
      let lineRes = await axios.get<LineAPIResponse[]>(`${process.env.REACT_APP_DATA_BASE_URL}/line.json`)
      lineRes.data.forEach(d => {
        let line = parseLine(d)
        this.lines.set(line.code, line)
        this.lines_id.set(line.id, line)
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
    this.stations.clear()
    this.stations_id.clear()
    this.lines.clear()
    this.lines_id.clear()
    this.tasks.clear()
    this.watch_current_position(false)

    console.log('service released')
  }

  set_position_accuracy(value: boolean) {
    console.log("position accuracy changed", value)
    this.position_options.enableHighAccuracy = value
    if (this.navigator_id) {
      this.watch_current_position(false)
      this.watch_current_position(true)
    }
  }

  watch_current_position(enable: boolean) {
    if (enable) {
      if (navigator.geolocation) {
        if (this.navigator_id) {
          console.log("already set")
          return
        }
        this.navigator_id = navigator.geolocation.watchPosition(
          (pos) => {
            store.dispatch(actions.setCurrentLocation(pos))
          },
          (err) => {
            console.log(err)
          },
          this.position_options
        )
        console.log("start watching position", this.position_options)
      } else {
        console.log("this device does not support Geolocation")
      }
    } else {
      if (this.navigator_id) {
        navigator.geolocation.clearWatch(this.navigator_id)
        this.navigator_id = null
        console.log("stop watching position")
      }
    }
  }

  get_current_position(): Promise<GeolocationPosition> {
    if (navigator.geolocation) {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve(pos)
          },
          (err) => {
            reject(err)
          },
          this.position_options
        )
      })
    } else {
      return Promise.reject("this device does not support Geolocation")
    }
  }

  async update_location(position: Utils.LatLng, k: number, r: number = 0): Promise<Station | null> {
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

  async update_rect(rect: Utils.RectBounds, max: number = Number.MAX_SAFE_INTEGER): Promise<Station[]> {
    if (max < 1) max = 1
    return await this.runSync("update_location", async () => {
      if (this.tree) {
        return this.tree.updateRectRegion(rect, max)
      } else {
        return Promise.reject("tree not initialized")
      }
    })

  }

  get_station_immediate(code: number): Station {
    return this.stations.get(code) as Station
  }

  async get_station_by_id(id: string): Promise<Station> {
    if (id.match(/^[0-9a-f]{6}$/)) {
      var s = this.stations_id.get(id)
      if (s) return s
      const res = await axios.get(`${process.env.REACT_APP_STATION_API_URL}/station?id=${id}`)
      var pos = {
        lat: res.data.lat,
        lng: res.data.lng,
      }
      // this 'update' operation loads station data as a segment
      await this.update_location(pos, 1)
      return this.stations_id.get(id) as Station
    }
    const code = parseInt(id)
    if (!isNaN(code)) {
      return await this.get_station(code)
    }
    throw Error("invalid station arg, not id nor code.")
  }

  async get_station_or_null(code: number): Promise<Station | undefined> {
    var s = this.stations.get(code)
    if (s) return s
    // step 1: get lat/lng of the target station
    // step 2: update neighbor stations
    try {
      const res = await axios.get(`${process.env.REACT_APP_STATION_API_URL}/station?code=${code}`)
      var pos = {
        lat: res.data.lat,
        lng: res.data.lng,
      }
      // this 'update' operation loads station data as a segment
      await this.update_location(pos, 1)
      return this.get_station_immediate(code)
    } catch (e) {
      console.warn("api error. station code:", code, e)
      return undefined
    }
  }

  async get_station(code: number): Promise<Station> {
    var s = await this.get_station_or_null(code)
    if (s) {
      return s
    } else {
      throw Error(`station not found code:${code}`)
    }
  }

  get_line(code: number): Line {
    return this.lines.get(code) as Line
  }

  get_line_or_null(code: number): Line | undefined {
    return this.lines.get(code)
  }

  get_line_by_id(id: string): Line | undefined {
    if (id.match(/^[0-9a-f]{6}$/)) {
      var line = this.lines_id.get(id)
      if (line) return line
    }
    const code = parseInt(id)
    if (!isNaN(code)) {
      return this.get_line_or_null(code)
    }
    return undefined
  }

  get_line_detail(code: number): Promise<Line> {
    const line = this.lines.get(code)
    if (!line) {
      return Promise.reject(`line not found id:${code}`)
    }
    // 単一のupdate_** 呼び出しでも同一segmentが複数から要求される
    const tag = `line-details-${code}`
    return this.runSync(tag, async () => {
      if (line.detail) return line
      let res = await axios.get<LineDetailAPIResponse>(`${process.env.REACT_APP_DATA_BASE_URL}/line/${code}.json`)
      let detail = parseLineDetail(res.data)
      line.detail = detail
      return line
    })
  }

  get_prefecture(code: number): string {
    return this.prefecture.get(code) as string
  }

  get_tree_segment(name: string): Promise<StationTreeSegmentResponse> {
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
        this.stations_id.set(s.id, s)
      })
      store.dispatch(actions.appendLoadedStation(list))
      this.tasks.set(tag, null)
      return data
    })
  }

  measure(pos1: Utils.LatLng, pos2: Utils.LatLng): number {
    var lng1 = Math.PI * pos1.lng / 180
    var lat1 = Math.PI * pos1.lat / 180
    var lng2 = Math.PI * pos2.lng / 180
    var lat2 = Math.PI * pos2.lat / 180
    var lng = (lng1 - lng2) / 2
    var lat = (lat1 - lat2) / 2
    return 6378137.0 * 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(lat), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(lng), 2)))
  }

  inside_rect(position: Utils.LatLng | Utils.RectBounds, rect: Utils.RectBounds): boolean {
    if (Utils.isLatLng(position)) {
      return (
        position.lat >= rect.south &&
        position.lat <= rect.north &&
        position.lng >= rect.west &&
        position.lng <= rect.east
      )
    } else {
      return (
        position.south >= rect.south
        && position.north <= rect.north
        && position.east <= rect.east
        && position.west >= rect.west
      )
    }
  }

}

const service = new StationService()
export default service
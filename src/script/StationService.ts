import axios from "axios"
import { StationKdTree } from "./KdTree"
import { Station } from "./Station"
import { Line } from "./Line"
import * as Utils from "./Utils"
import * as Actions from "./Actions"

const TAG_SEGMENT_PREFIX = "station-segment:"

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

	tasks: Map<string, Promise<any> | null> = new Map()

	async initialize(): Promise<StationService> {
		if (this.initialized) {
			return Promise.resolve(this)
		}

		const tag = "initialize"
		var task = this.tasks.get(tag)
		if (task) return task

		this.stations.clear()
		this.lines.clear()
		this.stations_id.clear()
		this.lines_id.clear()
		this.prefecture.clear()

		task = new StationKdTree(this).initialize("root").then(tree => {
			this.tree = tree
			return axios.get(`${process.env.REACT_APP_DATA_BASE_URL}/line.json`)
		}).then(res => {
			res.data.forEach(d => {
				var line = new Line(d)
				this.lines.set(line.code, line)
				this.lines_id.set(line.id, line)
			})
			return axios.get(process.env.REACT_APP_PREFECTURE_URL)
		}).then(res => {
			this.prefecture = new Map()
			res.data.split('\n').forEach((line: string) => {
				var cells = line.split(',')
				if (cells.length === 2) {
					this.prefecture.set(parseInt(cells[0]), cells[1])
				}
			})
			console.log('service initialized', this)
			this.initialized = true
			this.tasks.set(tag, null)
			return this
		})
		this.tasks.set(tag, task)
		return task
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
						Actions.setCurrentPosition(pos)
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

	update_location(position: Utils.LatLng, k: number, r: number = 0): Promise<any> {
		if (!k || k <= 0) k = 1
		if (!r || r < 0) r = 0
		if (this.tree) {
			return this.tree.updateLocation(position, k, r)
		} else {
			return Promise.reject("tree not initialized")
		}
	}

	update_rect(rect: Utils.RectBounds, max: number = Number.MAX_SAFE_INTEGER): Promise<Station[]> {
		if (max < 1) max = 1
		if (this.tree) {
			return this.tree.updateRectRegion(rect, max)
		} else {
			return Promise.reject("tree not initialized")
		}

	}

	get_station_immediate(code: number): Station {
		return this.stations.get(code) as Station
	}

	async get_station_by_id(id: string): Promise<Station | undefined> {
		if (id.match(/^[0-9a-f]{6}$/)) {
			var s = this.stations_id.get(id)
			if (s) return s
			try {
				const res = await axios.get(`${process.env.REACT_APP_STATION_API_URL}/station?id=${id}`)
				var pos = {
					lat: res.data.lat,
					lng: res.data.lng,
				}
				// this 'update' operation loads station data as a segment
				await this.update_location(pos, 1)
				return this.stations_id.get(id) as Station
			} catch (e) {
				console.warn("api error. station id:", id, e)
				// return undefined
			}
		}
		const code = parseInt(id)
		if (!isNaN(code)) {
			return this.get_station_or_null(code)
		}
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
		} else if (line.has_details) {
			return Promise.resolve(line)
		}
		const tag = `line-details-${code}`
		var task = this.tasks.get(tag)
		if (task) {
			return task
		} else {
			task = axios.get(`${process.env.REACT_APP_DATA_BASE_URL}/line/${code}.json`).then(res => {
				const data = res.data
				line.station_list = data["station_list"].map(item => {
					var c = item['code']
					var s = this.stations.get(c)
					if (s) return s
					s = new Station(item)
					this.stations.set(c, s)
					this.stations_id.set(s.id, s)
					return s
				})
				const polyline = data.polyline_list
				if (polyline) {
					if (polyline['type'] !== 'FeatureCollection') console.error("invalide line polyline", polyline)
					line.polyline_list = polyline["features"].map(d => Utils.parse_polyline(d))
					const prop = polyline['properties']
					line.north = prop['north']
					line.south = prop['south']
					line.east = prop['east']
					line.west = prop['west']
				}
				line.has_details = true
				this.tasks.set(tag, null)
				return line
			})
			this.tasks.set(tag, task)
			return task
		}
	}

	get_prefecture(code: number): string {
		return this.prefecture.get(code) as string
	}

	get_tree_segment(name: string): Promise<any> {
		const tag = `${TAG_SEGMENT_PREFIX}${name}`
		var task = this.tasks.get(tag)
		// be sure to avoid loading the same segment
		if (task) {
			return task
		}
		task = axios.get(`${process.env.REACT_APP_DATA_BASE_URL}/tree/${name}.json`).then(res => {
			console.log("tree-segment", name, res.data)
			const data = res.data
			var list = data.node_list.filter(e => {
				return !e.segment
			}).map(e => new Station(e))
			list.forEach(s => {
				this.stations.set(s.code, s)
				this.stations_id.set(s.id, s)
			})
			Actions.onStationLoaded(list)
			this.tasks.set(tag, null)
			return data
		})
		this.tasks.set(tag, task)
		return task
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
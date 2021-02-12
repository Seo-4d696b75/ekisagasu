import { GoogleApiWrapper, Map, Marker, Polygon, Polyline, Circle, GoogleAPI, IMapProps } from "google-maps-react"
import React from "react"
import "./Map.css"
import { StationDialog, LineDialog } from "./InfoDialog"
import ProgressBar from "./ProgressBar"
import StationService from "../script/StationService"
import { CSSTransition } from "react-transition-group"
import * as Rect from "../diagram/Rect"
import pin_station from "../img/map_pin_station.svg"
import pin_location from "../img/map_pin.svg"
import * as Utils from "../script/Utils"
import VoronoiWorker from "worker-loader!./../script/VoronoiWorker";  // eslint-disable-line import/no-webpack-loader-syntax

import store from "../script/Store"
import { Station } from "../script/Station"
import { Line } from "../script/Line"
import { Unregister } from "../script/LiveData"

const VORONOI_COLOR = [
	"#0000FF",
	"#00AA00",
	"#FF0000",
	"#CCCC00"
]

const ZOOM_TH = 10
const VORONOI_SIZE_TH = 500

interface RadarStation {
	station: Station
	dist: number
	lines: string
}

enum DialogType {
	Station,
	Line,
	Position,
}

interface DialogProps<T, E> {
	type: T
	props: E
}

type StationDialogProps = DialogProps<DialogType.Station, {
	station: Station
	radar_list: Array<RadarStation>
	prefecture: string
	lines: Array<Line>
}>

type LineDialogProps = DialogProps<DialogType.Line, {
	line: Line
	line_details: boolean
}>

type PosDialogProps = DialogProps<DialogType.Position, {
	station: Station
	radar_list: Array<RadarStation>
	prefecture: string
	location: {
		pos: Utils.LatLng
		dist: number
	}
}>

type InfoDialog =
	StationDialogProps |
	LineDialogProps |
	PosDialogProps

interface MapProps {
	google: GoogleAPI
}

interface MapState {
	clicked_marker: Utils.LatLng | null
	station_marker: Array<Utils.LatLng>
	voronoi_show: boolean
	voronoi: Array<Station>
	high_voronoi_show: boolean
	high_voronoi: Array<Utils.LatLng[]>
	worker_running: boolean
	polyline_show: boolean
	polyline_list: Array<Utils.PolylineProps>
	screen_wide: boolean
	info_dialog: InfoDialog | null
	radar_k: number
	show_current_position: boolean
	current_position: Utils.LatLng | null
	current_accuracy: number
	current_heading: number | null
}


export class MapContainer extends React.Component<MapProps, MapState> {

	state: MapState = {
		clicked_marker: null,
		station_marker: [],
		voronoi_show: true,
		voronoi: [],
		high_voronoi_show: false,
		high_voronoi: [],
		worker_running: false,
		polyline_show: false,
		polyline_list: [],
		screen_wide: false,
		info_dialog: null,
		radar_k: 12,
		show_current_position: false,
		current_position: null,
		current_accuracy: 0,
		current_heading: null
	}

	worker: Worker | null = null

	map_ref = React.createRef<HTMLDivElement>()
	map: google.maps.Map | null = null

	unregisters: Unregister[] = []

	mouse_event: UIEvent | null = null
	solved_bounds: Utils.RectBounds | null = null

	screenResizedCallback: ((this: Window, e: UIEvent) => void) | undefined = undefined

	componentDidMount() {

		StationService.initialize().then(service => {
			if (this.map) {
				this.onBoundsChanged(true)
			}
		})
		// set callback invoked when screen resized
		this.screenResizedCallback = this.onScreenResized.bind(this)
		window.addEventListener("resize", this.screenResizedCallback)
		this.onScreenResized()

		this.unregisters = [
			store.radar_k.observe(this.onRadarKChanged.bind(this)),
			store.show_request.listen(this.onShowStationItem.bind(this)),
			store.current_position.observe(this.onCurrentPositionChanged.bind(this)),
			store.watch_position.observe(this.showCurrentPosition.bind(this))
		]
	}

	componentWillUnmount() {
		StationService.release()
		this.map = null
		if (this.screenResizedCallback) {
			window.removeEventListener("resize", this.screenResizedCallback)
		}
		this.unregisters.forEach(c => c())
	}

	updateRadarList(pos: Utils.LatLng, k: number, info: StationDialogProps | PosDialogProps) {
		StationService.update_location(pos, k, 0).then(() => {
			info.props.radar_list = this.makeRadarList(pos, k)
			this.setState({
				...this.state,
				info_dialog: info,
			})
		})
	}

	onRadarKChanged(k: number) {
		if (this.state.info_dialog) {
			switch (this.state.info_dialog.type) {
				case DialogType.Position: {
					this.updateRadarList(
						this.state.info_dialog.props.location.pos,
						k,
						this.state.info_dialog
					)
					break
				}
				case DialogType.Station: {
					this.updateRadarList(
						this.state.info_dialog.props.station.position,
						k,
						this.state.info_dialog
					)
					break
				}
				default:
			}
		}
		this.setState({
			...this.state,
			radar_k: k,
		})
	}

	onShowStationItem(item: Station | Line) {
		if (item instanceof Station) {
			this.showStation(item)
		} else {
			this.showLine(item)
		}
	}

	onCurrentPositionChanged(pos: GeolocationPosition) {
		this.setState({
			...this.state,
			current_position: {
				lat: pos.coords.latitude,
				lng: pos.coords.longitude
			},
			current_accuracy: pos.coords.accuracy,
			current_heading: pos.coords.heading,
		})
	}

	showCurrentPosition(enable: boolean) {
		this.setState({
			...this.state,
			show_current_position: enable,
		})
	}

	onScreenResized() {
		var wide = window.innerWidth >= 900
		console.log("resize", window.innerWidth, wide)
		if (wide !== this.state.screen_wide) {
			this.setState(Object.assign({}, this.state, {
				screen_wide: wide,
			}))
		}
	}

	showRadarVoronoi(station: Station) {
		if (this.state.worker_running) {
			console.log("worker is running")
			return
		}
		if (this.state.high_voronoi_show) {
			this.setState({
				...this.state,
				high_voronoi_show: false,
				voronoi_show: true,
			})
			return
		}
		const worker = new VoronoiWorker()
		const service = StationService
		// register callback so that this process can listen message from worker
		worker.addEventListener('message', messaage => {
			var data = JSON.parse(messaage.data)
			if (data.type === 'points') {
				// point provide
				service.get_station(data.code).then(s => {
					return Promise.all(
						s.next.map(code => service.get_station(code))
					)
				}).then(stations => {
					var points = stations.map(s => {
						var point = {
							x: s.position.lng,
							y: s.position.lat,
							code: s.code
						}
						return point
					})
					worker.postMessage(JSON.stringify({
						type: 'points',
						code: data.code,
						points: points,
					}))
				})
			} else if (data.type === 'progress') {
				var list = this.state.high_voronoi
				list.push(data.polygon)
				this.setState({
					...this.state,
					high_voronoi: list
				})
			} else if (data.type === 'complete') {
				worker.terminate()
				this.worker = null
				this.setState({
					...this.state,
					worker_running: false,
				})
				if (this.map && this.map_ref.current) {
					var rect = this.map_ref.current.getBoundingClientRect()
					var bounds = Utils.get_bounds(this.state.high_voronoi[this.state.radar_k - 1])
					var props = Utils.get_zoom_property(bounds, rect.width, rect.height, ZOOM_TH, station.position, 100)
					this.map.panTo(props.center)
					this.map.setZoom(props.zoom)
				}
			} else if (data.type === "error") {
				console.error('fail to calc voronoi', data.err)
				worker.terminate()
				this.worker = null
				this.setState({
					...this.state,
					worker_running: false,
					voronoi_show: true,
					high_voronoi_show: false,
				})
			}
		})

		this.worker = worker

		var boundary = Rect.init(127, 46, 146, 26)
		var container = Rect.getContainer(boundary)
		var center = {
			x: station.position.lng,
			y: station.position.lat,
			code: station.code,
		}
		this.setState({
			...this.state,
			high_voronoi_show: true,
			high_voronoi: [],
			voronoi_show: false,
			polyline_show: false,
			worker_running: true,
		})
		worker.postMessage(JSON.stringify({
			type: 'start',
			container: container,
			k: this.state.radar_k,
			center: center,
		}))


	}

	showPolyline(line: Line) {
		if (!line.has_details || !this.map) return
		var polyline: Array<Utils.PolylineProps> = []
		var bounds: Utils.RectBounds = line
		if (line.polyline_list) {
			polyline = line.polyline_list
			bounds = line
		} else {
			var data = Utils.get_bounds(line.station_list)
			polyline = [{
				points: line.station_list.map(s => s.position),
				start: line.station_list[0].name,
				end: line.station_list[line.station_list.length - 1].name,
			}]
			bounds = data
		}
		this.setState({
			...this.state,
			polyline_show: true,
			polyline_list: polyline,
			high_voronoi_show: false,
			voronoi_show: true,
			station_marker: line.station_list.map(s => s.position)
		})
		if (this.map_ref.current) {
			var rect = this.map_ref.current.getBoundingClientRect()
			var props = Utils.get_zoom_property(bounds, rect.width, rect.height)

			this.map.panTo(props.center)
			this.map.setZoom(props.zoom)
			console.log('zoom to', props, line)
		}
	}

	getUIEvent(clickEvent: any): UIEvent {
		// googlemap onClick などのコールバック関数に渡させるイベントオブジェクトの中にあるUIEventを抽出
		// property名が謎
		// スマホではTouchEvent, マウスでは MouseEvent
		for (var p in clickEvent) {
			if (clickEvent[p] instanceof UIEvent) return clickEvent[p]
		}
		throw Error("UIEvent not found")
	}

	onMouseDown(event: any) {
		this.mouse_event = this.getUIEvent(event)
		//console.log('mousedown', this.mouse_event, event)
	}

	onMapReady(props?: IMapProps, map?: google.maps.Map, event?: any) {
		console.log("map ready", props)
		if (map) {

			map.addListener("mousedown", this.onMouseDown.bind(this))
			this.map = map
			map.setOptions({
				// this option can not be set via props in google-maps-react
				mapTypeControlOptions: {
					position: this.props.google.maps.ControlPosition.TOP_RIGHT,
					style: this.props.google.maps.MapTypeControlStyle.DROPDOWN_MENU
				}
			})
			StationService.get_current_position().then(pos => {
				var latlng = {
					lat: pos.coords.latitude,
					lng: pos.coords.longitude
				}
				map.setCenter(latlng)
				this.setState({
					...this.state,
					current_position: latlng,
				})
			}).catch(err => {
				console.log(err)
			})

		}
	}

	onMapRightClicked(props?: IMapProps, map?: google.maps.Map, event?: any) {

		const pos = {
			lat: event.latLng.lat(),
			lng: event.latLng.lng()
		}
		//console.log("right click", pos, event)
		this.focusAt(pos)
	}

	onMapClicked(props?: IMapProps, map?: google.maps.Map, event?: any) {
		const pos = {
			lat: event.latLng.lat(),
			lng: event.latLng.lng()
		}
		if (this.mouse_event && this.getUIEvent(event).timeStamp - this.mouse_event.timeStamp > 300) {
			console.log("map long clicked", pos, event)
			this.focusAt(pos)
		} else {
			console.log("map clicked", event)
			this.focusAtNearestStation(pos)
		}
	}

	onMapZoomChanged(props?: IMapProps, map?: google.maps.Map, event?: any) {
		if (map) {
			console.log("zoom", map.getZoom())
		}
	}


	onBoundsChanged(idle: boolean = false) {
		if (!this.map) return
		var bounds = this.map.getBounds()
		if (!bounds) return
		var ne = bounds.getNorthEast()
		var sw = bounds.getSouthWest()
		//console.log(ne.lat(), ne.lng(), sw.lat(), sw.lng())
		var rect = {
			south: sw.lat(),
			north: ne.lat(),
			west: sw.lng(),
			east: ne.lng()
		}
		if (this.solved_bounds && !idle) {
			var inside = StationService.inside_rect(rect, this.solved_bounds)
			var width1 = rect.east - rect.west
			var height1 = rect.north - rect.south
			var width2 = this.solved_bounds.east - this.solved_bounds.west
			var height2 = this.solved_bounds.north - this.solved_bounds.south
			if (!inside || width1 < width2 / 6 || height1 < height2 / 6) {
				this.updateBounds(rect)
			}
		} else {
			this.updateBounds(rect)
		}
	}

	onMapIdle(props?: IMapProps, map?: google.maps.Map, event?: any) {
		//console.log("idle")
		if (props && map) {
			this.onBoundsChanged(true)
		}
	}

	updateBounds(rect: Utils.RectBounds) {
		//console.log("updateBounds", rect)
		if (StationService.initialized && this.map) {
			const margin_width = Math.min(rect.east - rect.west, 0.5)
			const margin_height = Math.min(rect.north - rect.south, 0.5)
			const bounds = {
				north: rect.north + margin_height,
				south: rect.south - margin_height,
				east: rect.east + margin_width,
				west: rect.west - margin_width
			}
			const zoom = this.map.getZoom()
			const limit = zoom < ZOOM_TH ? VORONOI_SIZE_TH : undefined
			StationService.update_rect(bounds, limit).then(list => {
				this.setState({
					...this.state,
					voronoi: list,
					voronoi_show: !this.state.high_voronoi_show && (zoom >= ZOOM_TH || list.length < VORONOI_SIZE_TH),
				})
			})
			this.solved_bounds = bounds
		}
	}

	onMapDragStart(props?: IMapProps, map?: google.maps.Map) {
		if (this.state.high_voronoi_show) return
		if (this.state.polyline_show) return
		if (!this.state.screen_wide) {
			this.onInfoDialogClosed()
		}
	}

	onInfoDialogClosed() {
		// if any worker is running, terminate it
		if (this.state.worker_running && this.worker) {
			this.worker.terminate()
			this.worker = null
			console.log("worker terminated")
		}
		var show = (this.state.voronoi.length < VORONOI_SIZE_TH) || (this.map !== null && this.map.getZoom() >= ZOOM_TH)
		this.setState({
			...this.state,
			clicked_marker: null,
			worker_running: false,
			station_marker: [],
			info_dialog: null,
			high_voronoi_show: false,
			polyline_show: false,
			voronoi_show: show,
		})
	}

	focusAt(pos: Utils.LatLng) {
		if (!StationService.initialized) return
		if (this.state.high_voronoi_show) return
		StationService.update_location(pos, this.state.radar_k, 0).then(station => {

			if (this.map) {
				this.map.panTo(pos)
				if (this.map.getZoom() < 14) this.map.setZoom(14)
			}
			this.setState({
				...this.state,
				clicked_marker: pos,
				station_marker: [station.position],
				info_dialog: {
					type: DialogType.Position,
					props: {
						station: station,
						radar_list: this.makeRadarList(pos, this.state.radar_k),
						prefecture: StationService.get_prefecture(station.prefecture),
						location: {
							pos: pos,
							dist: StationService.measure(station.position, pos)
						}
					},
				},
				polyline_show: false,
				high_voronoi_show: false,
			})
		})

	}

	focusAtNearestStation(pos: Utils.LatLng) {
		if (!StationService.initialized) return
		if (this.state.high_voronoi_show) return
		StationService.update_location(pos, this.state.radar_k, 0).then(s => {
			console.log("update location", s)
			this.showStation(s)
		})
	}

	makeRadarList(pos: Utils.LatLng, k: number) {
		if (!StationService.tree) throw Error("Kd-tree not initialized yet")
		return StationService.tree.getNearStations(k).map(s => {
			return {
				station: s,
				dist: StationService.measure(s.position, pos),
				lines: s.lines.map(code => StationService.get_line(code).name).join(' '),
			}
		})
	}

	showStation(station: Station) {
		StationService.update_location(station.position, this.state.radar_k, 0).then(() => {

			this.setState({
				...this.state,
				info_dialog: {
					type: DialogType.Station,
					props: {
						station: station,
						radar_list: this.makeRadarList(station.position, this.state.radar_k),
						prefecture: StationService.get_prefecture(station.prefecture),
						lines: station.lines.map(code => StationService.get_line(code)),
					}
				},
				clicked_marker: null,
				station_marker: [station.position],
				polyline_show: false,
				high_voronoi_show: false,
			})
			if (this.map) {
				this.map.panTo(station.position)
				if (this.map.getZoom() < 14) this.map.setZoom(14)
			}
		})
	}

	showLine(line: Line) {
		this.setState({
			...this.state,
			info_dialog: {
				type: DialogType.Line,
				props: {
					line: line,
					line_details: line.has_details,
				}
			},
			clicked_marker: null,
			station_marker: [],
			polyline_show: false,
			high_voronoi_show: false,
		})
		if (!line.has_details) {
			StationService.get_line_detail(line.code).then(l => {
				this.setState({
					...this.state,
					info_dialog: {
						type: DialogType.Line,
						props: {
							line: l,
							line_details: true,
						}
					},
				})
			})
		}
	}

	render() {
		return (
			<div className='Map-container'>
				<div className='Map-relative' ref={this.map_ref}>

					<Map
						google={this.props.google}
						zoom={14}
						initialCenter={{ lat: 35.681236, lng: 139.767125 }}
						onReady={this.onMapReady.bind(this)}
						onClick={this.onMapClicked.bind(this)}
						onBoundsChanged={() => this.onBoundsChanged()}
						onZoomChanged={this.onMapZoomChanged.bind(this)}
						onDragstart={this.onMapDragStart.bind(this)}
						onRightclick={this.onMapRightClicked.bind(this)}
						onIdle={this.onMapIdle.bind(this)}
						fullscreenControl={false}
						streetViewControl={false}
						zoomControl={true}
						gestureHandling={"greedy"}
						mapTypeControl={true}

					>
						{this.state.show_current_position && this.state.current_position ? (
							<Marker
								position={this.state.current_position}
								clickable={false}
								icon={{
									path: this.props.google.maps.SymbolPath.CIRCLE,
									fillColor: "#154bb6",
									fillOpacity: 1.0,
									strokeColor: "white",
									strokeWeight: 1.2,
									scale: 8,
								}}></Marker>
						) : null}
						{this.state.show_current_position
							&& this.state.current_position
							&& this.state.current_heading
							&& !isNaN(this.state.current_heading) ? (
								<Marker
									position={this.state.current_position}
									clickable={false}
									icon={{
										//url: require("../img/direction_pin.svg"),
										anchor: new this.props.google.maps.Point(64, 64),
										path: "M 44 36 A 40 40 0 0 1 84 36 L 64 6 Z",
										fillColor: "#154bb6",
										fillOpacity: 1.0,
										strokeColor: "white",
										strokeWeight: 1.2,
										scale: 0.3,
										rotation: this.state.current_heading,
									}}></Marker>
							) : null}
						{this.state.show_current_position && this.state.current_position ? (
							<Circle
								visible={this.state.current_accuracy > 10}
								center={this.state.current_position}
								radius={this.state.current_accuracy}
								strokeColor="#0088ff"
								strokeOpacity={0.8}
								strokeWeight={1}
								fillColor="#0088ff"
								fillOpacity={0.2}
								clickable={false}></Circle>
						) : null}
						<Marker
							visible={this.state.clicked_marker !== null}
							position={this.state.clicked_marker || undefined}
							icon={pin_location} >
						</Marker>
						{this.state.station_marker.map((pos, i) => (
							<Marker
								key={i}
								position={pos}
								icon={pin_station}>
							</Marker>
						))}
						{this.state.voronoi_show ? this.state.voronoi.map((s, i) => (
							<Polygon
								key={i}
								paths={s.voronoi_points}
								strokeColor="#0000FF"
								strokeWeight={1}
								strokeOpacity={0.8}
								fillOpacity={0.0}
								clickable={false} />
						)) : null}
						{this.state.high_voronoi_show ? this.state.high_voronoi.map((points, i) => (
							<Polygon
								key={i}
								paths={points}
								strokeColor={(i === this.state.radar_k - 1) ? "#000000" : VORONOI_COLOR[i % VORONOI_COLOR.length]}
								strokeWeight={1}
								strokeOpacity={0.8}
								fillOpacity={0.0}
								clickable={false} />
						)) : null}
						{this.state.polyline_show ? this.state.polyline_list.map((p, i) => (
							<Polyline
								key={i}
								path={p.points}
								strokeColor="#FF0000"
								strokeWeight={2}
								strokeOpacity={0.8}
								fillOpacity={0.0}
								clickable={false} />
						)) : null}
					</Map>

					<CSSTransition
						in={this.state.info_dialog !== null}
						className="Dialog-container"
						timeout={400}>
						<div className="Dialog-container">
							<div className="Dialog-frame">

								{this.renderInfoDialog()}
								<CSSTransition
									in={this.state.worker_running}
									className="Dialog-message"
									timeout={0}>
									<div className="Dialog-message">
										<div className="Progress-container">
											<ProgressBar visible={this.state.worker_running}></ProgressBar>
										</div>
										<div className="Wait-message">計算中…{(this.state.high_voronoi.length).toString().padStart(2)}/{this.state.radar_k}</div>
									</div>
								</CSSTransition>


							</div>

						</div>
					</CSSTransition>

				</div>
			</div>

		)
	}

	renderInfoDialog(): any {
		var dom: any = null
		var info = this.state.info_dialog
		if (info) {
			switch (info.type) {
				case DialogType.Line: {
					dom = (
						<LineDialog
							line={info.props.line}
							line_details={info.props.line_details}
							onClosed={this.onInfoDialogClosed.bind(this)}
							onShowPolyline={this.showPolyline.bind(this)} />
					)
					break
				}
				case DialogType.Station: {
					dom = (
						<StationDialog
							station={info.props.station}
							radar_k={this.state.radar_k}
							radar_list={info.props.radar_list}
							prefecture={info.props.prefecture}
							lines={info.props.lines}
							location={null}
							onClosed={this.onInfoDialogClosed.bind(this)}
							onShowVoronoi={this.showRadarVoronoi.bind(this)} />
					)
					break
				}
				case DialogType.Position: {
					dom = (
						<StationDialog
							station={info.props.station}
							radar_k={this.state.radar_k}
							radar_list={info.props.radar_list}
							prefecture={info.props.prefecture}
							lines={null}
							location={info.props.location}
							onClosed={this.onInfoDialogClosed.bind(this)}
							onShowVoronoi={this.showRadarVoronoi.bind(this)} />
					)

					break
				}
			}
		}
		return dom
	}
}

const LoadingContainer = (props: any) => (
	<div className='Map-container'>Map is loading...</div>
)

export default GoogleApiWrapper({
	apiKey: process.env.REACT_APP_API_KEY,
	language: "ja",
	LoadingContainer: LoadingContainer,
})(MapContainer)


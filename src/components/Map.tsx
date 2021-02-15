import { GoogleApiWrapper, Map, Marker, Polygon, Polyline, Circle, GoogleAPI, IMapProps } from "google-maps-react"
import React from "react"
import "./Map.css"
import { StationDialog, LineDialog } from "./InfoDialog"
import StationService from "../script/StationService"
import { CSSTransition } from "react-transition-group"
import * as Rect from "../diagram/Rect"
import pin_station from "../img/map_pin_station.svg"
import pin_location from "../img/map_pin.svg"
import * as Utils from "../script/Utils"
import VoronoiWorker from "worker-loader!./../script/VoronoiWorker";  // eslint-disable-line import/no-webpack-loader-syntax
import { CircularProgress } from "@material-ui/core"
import { Station } from "../script/Station"
import { Line } from "../script/Line"
import { GlobalState } from "../script/Reducer"
import * as Actions from "../script/Actions"
import { connect } from "react-redux"

const VORONOI_COLOR = [
	"#0000FF",
	"#00AA00",
	"#FF0000",
	"#CCCC00"
]

const ZOOM_TH = 10
const VORONOI_SIZE_TH = 500

export interface RadarStation {
	station: Station
	dist: number
	lines: string
}

export enum DialogType {
	Station,
	Line,
	Position,
}

interface DialogProps<T, E> {
	type: T
	props: E
}

export type StationDialogProps = DialogProps<DialogType.Station, {
	station: Station
	radar_list: Array<RadarStation>
	prefecture: string
	lines: Array<Line>
}>

export type LineDialogProps = DialogProps<DialogType.Line, {
	line: Line
	line_details: boolean
}>

export type PosDialogProps = DialogProps<DialogType.Position, {
	station: Station
	radar_list: Array<RadarStation>
	prefecture: string
	location: {
		pos: Utils.LatLng
		dist: number
	}
}>

export type InfoDialog =
	StationDialogProps |
	LineDialogProps |
	PosDialogProps

export interface StationDialogTransition {
	show_high_voronoi: boolean
	station: Station
	location: Utils.LatLng | undefined
}

function isStationDialogTransition(item: MapTransition): item is StationDialogTransition {
	var t = item as any
	return t.show_high_voronoi !== undefined && typeof t.show_high_voronoi === 'boolean'
}

export interface LineDialogTransition {
	show_polyline: boolean
	polyline_list: Array<Utils.PolylineProps>
	stations_marker: Array<Utils.LatLng>
}

function isLineDialogTranstion(t: any): t is LineDialogTransition {
	return t.show_polyline !== undefined && typeof t.show_polyline === 'boolean'
}

export type DialogTransition =
	StationDialogTransition |
	LineDialogTransition

function isDialogTransition(item: MapTransition): item is DialogTransition {
	var t = item as any
	return typeof t !== 'string'
}

export type MapTransition =
	DialogTransition |
	"idle" |
	"loading"

interface MapProps {
	radar_k: number
	show_current_position: boolean
	current_position: Utils.LatLng | null
	current_accuracy: number
	current_heading: number | null
	info_dialog: InfoDialog | null
	transition: MapTransition
}

function mapGlobalState2Props(state: GlobalState): MapProps {
	const coords = state.current_position?.coords
	return {
		radar_k: state.radar_k,
		show_current_position: state.watch_position,
		current_position: coords ? { lat: coords.latitude, lng: coords.longitude } : null,
		current_accuracy: coords ? coords.accuracy : 0,
		current_heading: coords ? coords.heading : 0,
		info_dialog: state.info_dialog,
		transition: state.transition,
	}
}

interface WrappedMapProps extends MapProps {
	google: GoogleAPI
}

interface MapState {
	voronoi: Array<Station>
	hide_voronoi: boolean
	high_voronoi: Array<Utils.LatLng[]>
	worker_running: boolean
	screen_wide: boolean
}


export class MapContainer extends React.Component<WrappedMapProps, MapState> {

	state: MapState = {

		voronoi: [],
		hide_voronoi: false,
		high_voronoi: [],
		worker_running: false,
		screen_wide: false,
	}

	worker: Worker | null = null

	map_ref = React.createRef<HTMLDivElement>()
	map: google.maps.Map | null = null

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

	}

	componentWillUnmount() {
		StationService.release()
		this.map = null
		if (this.screenResizedCallback) {
			window.removeEventListener("resize", this.screenResizedCallback)
		}
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
		const transition = this.props.transition
		if (!isStationDialogTransition(transition)) return

		if (transition.show_high_voronoi) {
			Actions.setMapTransition("idle")
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
					high_voronoi: list,
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
					var bounds = Utils.get_bounds(this.state.high_voronoi[this.props.radar_k - 1])
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
				})
				Actions.setMapTransition("idle")
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
			worker_running: true,
			high_voronoi: [],
		})
		Actions.setMapTransition({
			...transition,
			show_high_voronoi: true,
		})
		worker.postMessage(JSON.stringify({
			type: 'start',
			container: container,
			k: this.props.radar_k,
			center: center,
		}))


	}

	showPolyline(line: Line) {
		if (!line.has_details || !this.map) return
		const t = this.props.transition
		if (!isLineDialogTranstion(t) || t.show_polyline) return
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
		Actions.setMapTransition({
			...t,
			show_polyline: true,
			polyline_list: polyline,
			stations_marker: line.station_list.map(s => s.position)
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
				Actions.setCurrentPosition(pos)
			}).catch(err => {
				console.log(err)
			})
			Actions.setMapTransition("idle")

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
					hide_voronoi: (zoom < ZOOM_TH && list.length >= VORONOI_SIZE_TH),
				})
			})
			this.solved_bounds = bounds
		}
	}

	onMapDragStart(props?: IMapProps, map?: google.maps.Map) {
		var t = this.props.transition
		if (isStationDialogTransition(t) && t.show_high_voronoi) return
		if (isLineDialogTranstion(t) && t.show_polyline) return
		if (!this.state.screen_wide) {
			this.onInfoDialogClosed()
		}
	}

	onInfoDialogClosed() {
		// if any worker is running, terminate it
		if (this.state.worker_running && this.worker) {
			this.worker.terminate()
			this.worker = null
			this.setState({
				...this.state,
				worker_running: false,
			})
			console.log("worker terminated")
		}
		Actions.setMapTransition('idle')
	}

	focusAt(pos: Utils.LatLng) {
		if (!StationService.initialized) return
		var t = this.props.transition
		if (isStationDialogTransition(t) && t.show_high_voronoi) return

		if (this.map) {
			this.map.panTo(pos)
			if (this.map.getZoom() < 14) this.map.setZoom(14)
		}
		Actions.requestShowPosition(pos)

	}

	focusAtNearestStation(pos: Utils.LatLng) {
		if (!StationService.initialized) return
		var t = this.props.transition
		if (isStationDialogTransition(t) && t.show_high_voronoi) return
		StationService.update_location(pos, this.props.radar_k, 0).then(s => {
			console.log("update location", s)
			this.showStation(s)
		})
	}


	showStation(station: Station) {
		if (this.map) {
			this.map.panTo(station.position)
			if (this.map.getZoom() < 14) this.map.setZoom(14)
		}
		Actions.requestShowStation(station)
	}

	showLine(line: Line) {
		Actions.requestShowLine(line)
	}

	render() {
		const t = this.props.transition
		const clicked_marker = isStationDialogTransition(this.props.transition)
			? this.props.transition.location : undefined
		const station_maker = isStationDialogTransition(this.props.transition)
			? this.props.transition.station.position : undefined
		const show_voronoi = !this.state.hide_voronoi && !(isStationDialogTransition(t) && t.show_high_voronoi)
		const polyline = isLineDialogTranstion(t) && t.show_polyline ? t : null
		const high_voronoi = isStationDialogTransition(t) && t.show_high_voronoi ? this.state.high_voronoi : null
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
						{this.props.show_current_position && this.props.current_position ? (
							<Marker
								position={this.props.current_position}
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
						{this.props.show_current_position
							&& this.props.current_position
							&& this.props.current_heading
							&& !isNaN(this.props.current_heading) ? (
								<Marker
									position={this.props.current_position}
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
										rotation: this.props.current_heading,
									}}></Marker>
							) : null}
						{this.props.show_current_position && this.props.current_position ? (
							<Circle
								visible={this.props.current_accuracy > 10}
								center={this.props.current_position}
								radius={this.props.current_accuracy}
								strokeColor="#0088ff"
								strokeOpacity={0.8}
								strokeWeight={1}
								fillColor="#0088ff"
								fillOpacity={0.2}
								clickable={false}></Circle>
						) : null}
						<Marker
							visible={clicked_marker !== undefined}
							position={clicked_marker}
							icon={pin_location} >
						</Marker>
						<Marker
							visible={station_maker !== undefined}
							position={station_maker}
							icon={pin_station} >
						</Marker>
						{polyline ? polyline.stations_marker.map((pos, i) => (
							<Marker
								key={i}
								position={pos}
								icon={pin_station}>
							</Marker>
						)) : null}
						{show_voronoi ? this.state.voronoi.map((s, i) => (
							<Polygon
								key={i}
								paths={s.voronoi_points}
								strokeColor="#0000FF"
								strokeWeight={1}
								strokeOpacity={0.8}
								fillOpacity={0.0}
								clickable={false} />
						)) : null}
						{high_voronoi ? high_voronoi.map((points, i) => (
							<Polygon
								key={i}
								paths={points}
								strokeColor={(i === this.props.radar_k - 1) ? "#000000" : VORONOI_COLOR[i % VORONOI_COLOR.length]}
								strokeWeight={1}
								strokeOpacity={0.8}
								fillOpacity={0.0}
								clickable={false} />
						)) : null}
						{polyline ? polyline.polyline_list.map((p, i) => (
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
						in={isDialogTransition(t)}
						className="Dialog-container"
						timeout={400}>
						<div className="Dialog-container">
							<div className="Dialog-frame">

								{this.renderInfoDialog()}
								<CSSTransition
									in={this.state.worker_running}
									className="Dialog-message"
									timeout={0}>
									{high_voronoi ? (
										<div className="Dialog-message">
											<div className="Progress-container">
												<CircularProgress
													value={high_voronoi.length * 100 / this.props.radar_k}
													size={36}
													color="primary"
													thickness={5.0}
													variant="indeterminate" />
											</div>
											<div className="Wait-message">計算中…{(high_voronoi.length).toString().padStart(2)}/{this.props.radar_k}</div>
										</div>
									) : (<div>no message</div>)}
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
		var info = this.props.info_dialog
		if (info) {
			switch (info.type) {
				case DialogType.Line: {
					dom = (
						<LineDialog
							info={info}
							onStationSelected={this.showStation.bind(this)}
							onClosed={this.onInfoDialogClosed.bind(this)}
							onShowPolyline={this.showPolyline.bind(this)} />
					)
					break
				}
				case DialogType.Position:
				case DialogType.Station: {
					dom = (
						<StationDialog
							info={info}
							onStationSelected={this.showStation.bind(this)}
							onLineSelected={this.showLine.bind(this)}
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

export default connect(mapGlobalState2Props)(
	GoogleApiWrapper({
		apiKey: process.env.REACT_APP_API_KEY,
		language: "ja",
		LoadingContainer: LoadingContainer,
	})(MapContainer)
)


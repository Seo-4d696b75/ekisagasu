import { GoogleApiWrapper, Map, Marker, Polygon, Polyline, Circle, GoogleAPI, IMapProps } from "google-maps-react"
import React from "react"
import "./Map.css"
import { LineDialog } from "./LineDialog"
import StationService from "../script/StationService"
import { CSSTransition } from "react-transition-group"
import * as Rect from "../diagram/Rect"
import pin_station from "../img/map_pin_station.svg"
import pin_location from "../img/map_pin.svg"
import ic_mylocation from "../img/ic_mylocation.png"
import * as Utils from "../script/Utils"
import VoronoiWorker from "worker-loader!./../script/VoronoiWorker";  // eslint-disable-line import/no-webpack-loader-syntax
import { CircularProgress } from "@material-ui/core"
import { Station } from "../script/Station"
import { Line } from "../script/Line"
import { GlobalState } from "../script/Reducer"
import * as Actions from "../script/Actions"
import { connect } from "react-redux"
import { PropsEvent } from "../script/Event"
import qs from "query-string"
import { CurrentPosDialog } from "./CurrentPosDialog"
import { StationDialog } from "./StationDialog"

const VORONOI_COLOR = [
	"#0000FF",
	"#00AA00",
	"#FF0000",
	"#CCCC00"
]

const ZOOM_TH_VORONOI = 10
const zomm_TH_PIN = 12
const VORONOI_SIZE_TH = 500

export interface RadarStation {
	station: Station
	dist: number
	lines: string
}

export enum DialogType {
	STATION,
	LINE,
	SELECT_POSITION,
	CURRENT_POSITION,
}

interface DialogPropsBase<T, E> {
	type: T
	props: E
}

interface StationDialogPayload {
	station: Station
	radar_list: Array<RadarStation>
	prefecture: string
	lines: Array<Line>
}

interface PosDialogPayload extends StationDialogPayload {
	position: Utils.LatLng
	dist: number
}

export type StationPosDialogProps = DialogPropsBase<DialogType.STATION, StationDialogPayload>
export type SelectPosDialogProps = DialogPropsBase<DialogType.SELECT_POSITION, PosDialogPayload>
export type CurrentPosDialogProps = DialogPropsBase<DialogType.CURRENT_POSITION, PosDialogPayload>

export type LineDialogProps = DialogPropsBase<DialogType.LINE, {
	line: Line
	line_details: boolean
}>

export type StationDialogProps =
	StationPosDialogProps |
	SelectPosDialogProps |
	CurrentPosDialogProps

export enum NavType {
	LOADING,
	IDLE,
	DIALOG_STATION_POS,
	DIALOG_LINE,
	DIALOG_SELECT_POS,
}

interface NavStateBase<T, E> {
	type: T
	data: E
}

function isStationDialog(nav: NavState): nav is StationDialogNav {
	switch (nav.type) {
		case NavType.DIALOG_SELECT_POS:
		case NavType.DIALOG_STATION_POS:
			return true
		default:
			return false
	}
}

function isDialog(nav: NavState): nav is InfoDialogNav {
	switch (nav.type) {
		case NavType.DIALOG_SELECT_POS:
		case NavType.DIALOG_STATION_POS:
		case NavType.DIALOG_LINE:
			return true
		default:
			return false
	}
}

export type StationPosDialogNav = NavStateBase<NavType.DIALOG_STATION_POS, {
	dialog: StationPosDialogProps,
	show_high_voronoi: boolean
}>

export type SelectPosDialogNav = NavStateBase<NavType.DIALOG_SELECT_POS, {
	dialog: SelectPosDialogProps,
	show_high_voronoi: boolean
}>

type LineDialogNav = NavStateBase<NavType.DIALOG_LINE, {
	dialog: LineDialogProps
	show_polyline: boolean
	polyline_list: Array<Utils.PolylineProps>
	stations_marker: Array<Utils.LatLng>
}>

export type IdleNav = NavStateBase<NavType.IDLE, {
	dialog: CurrentPosDialogProps | null
}>

export type StationDialogNav =
	StationPosDialogNav |
	SelectPosDialogNav

export type InfoDialogNav =
	StationDialogNav |
	LineDialogNav

export type NavState =
	InfoDialogNav |
	NavStateBase<NavType.LOADING, null> |
	IdleNav

interface MapProps {
	radar_k: number
	show_current_position: boolean
	show_station_pin: boolean
	nav: NavState
	focus: PropsEvent<Utils.LatLng>
	current_location: PropsEvent<GeolocationPosition>
	voronoi: Array<Station>
	query: qs.ParsedQuery<string>
}

function mapGlobalState2Props(state: GlobalState, ownProps: any): MapProps {
	return {
		radar_k: state.radar_k,
		show_current_position: state.watch_position,
		show_station_pin: state.show_station_pin,
		nav: state.nav,
		focus: state.map_focus,
		current_location: state.current_location_update,
		voronoi: state.stations,
		query: ownProps.query as qs.ParsedQuery<string>
	}
}

interface WrappedMapProps extends MapProps {
	google: GoogleAPI
}

interface MapState {
	current_position: google.maps.LatLng | null
	current_accuracy: number
	current_heading: number | null
	voronoi: Array<Station>
	hide_voronoi: boolean
	hide_pin: boolean
	high_voronoi: Array<Utils.LatLng[]>
	worker_running: boolean
	screen_wide: boolean
}


export class MapContainer extends React.Component<WrappedMapProps, MapState> {

	state: MapState = {
		current_position: null,
		current_accuracy: 0,
		current_heading: null,
		voronoi: [],
		hide_voronoi: false,
		hide_pin: false,
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

		StationService.initialize()
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

	componentDidUpdate() {
		this.props.focus.observe("map", pos => {
			if (this.map) {
				this.map.panTo(pos)
				if (this.map.getZoom() < 14) this.map.setZoom(14)
			}
		})

		this.props.current_location.observe("map", (pos) => {
			const p = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude)
			this.setState({
				...this.state,
				current_position: p,
				current_accuracy: pos.coords.accuracy,
				current_heading: pos.coords.heading,
			})
			if (this.props.show_current_position && this.props.nav.type === NavType.IDLE) {
				this.moveToCurrentPosition(p)
			}
		})
	}

	showRadarVoronoi(station: Station) {
		if (this.state.worker_running) {
			console.log("worker is running")
			return
		}
		const nav = this.props.nav
		if (!isStationDialog(nav)) return

		if (nav.data.show_high_voronoi) {
			Actions.setNavStateIdle()
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
						return {
							x: s.position.lng,
							y: s.position.lat,
							code: s.code
						}
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
					var props = Utils.get_zoom_property(bounds, rect.width, rect.height, ZOOM_TH_VORONOI, station.position, 100)
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
				Actions.setNavStateIdle()
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
		Actions.showHighVoronoi(nav)
		worker.postMessage(JSON.stringify({
			type: 'start',
			container: container,
			k: this.props.radar_k,
			center: center,
		}))


	}

	showPolyline(line: Line) {
		if (!line.has_details || !this.map) return
		const nav = this.props.nav
		if (nav.type !== NavType.DIALOG_LINE) return
		if (nav.data.show_polyline) return
		var polyline: Array<Utils.PolylineProps> = []
		var bounds: Utils.RectBounds
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
		Actions.showPolyline(
			nav.data.dialog,
			polyline,
			line.station_list.map(s => s.position)
		)
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


			Actions.setNavStateIdle()

			StationService.initialize().then(s => {
				// parse query actions
				if (typeof this.props.query.line == 'string') {
					console.log('query: line', this.props.query.line)
					var line = s.get_line_by_id(this.props.query.line)
					if (line) {
						Actions.requestShowLine(line).then(l => {
							this.showPolyline(l)
						})
						return
					}
				}
				if (typeof this.props.query.station == 'string') {
					console.log('query: station', this.props.query.station)
					s.get_station_by_id(this.props.query.station).then(station => {
						if (station) {
							Actions.requestShowStation(station).then(() => {
								if (typeof this.props.query.voronoi == 'string') {
									const str = this.props.query.voronoi.toLowerCase().trim()
									if (Utils.parseQueryBoolean(str)) {
										this.showRadarVoronoi(station)
									}
								}
							})
						} else {
							this.setCenterCurrentPosition(map)
						}
					})
					return
				}
				if (typeof this.props.query.mylocation == 'string') {
					console.log('query: location', this.props.query.mylocation)
					if (Utils.parseQueryBoolean(this.props.query.mylocation)) {
						Actions.setWatchCurrentPosition(true)
					}
				}
				// if no query, set map center current position
				this.setCenterCurrentPosition(map)
			})

		}
	}

	setCenterCurrentPosition(map: google.maps.Map) {
		// no move animation
		StationService.get_current_position().then(pos => {
			var latlng = {
				lat: pos.coords.latitude,
				lng: pos.coords.longitude
			}
			map.setCenter(latlng)
			Actions.setCurrentPosition(pos)
		}).catch(err => {
			console.log(err)
			alert("現在位置を利用できません. ブラウザから位置情報へのアクセスを許可してください.")
		})
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

	onMapIdle(props?: IMapProps, map?: google.maps.Map, event?: any) {

		if (StationService.initialized && this.map) {
			this.updateBounds(this.map)
		}
	}

	updateBounds(map: google.maps.Map) {

		const bounds = map.getBounds()
		if (!bounds) return
		const zoom = map.getZoom()
		var hide = (zoom < ZOOM_TH_VORONOI)
		this.setState({
			...this.state,
			hide_voronoi: hide,
			hide_pin: zoom < zomm_TH_PIN,
		})
		if (!hide) {
			var ne = bounds.getNorthEast()
			var sw = bounds.getSouthWest()
			var margin = Math.max(ne.lat() - sw.lat(), ne.lng() - sw.lng()) * 0.5
			var rect = {
				south: sw.lat() - margin,
				north: ne.lat() + margin,
				west: sw.lng() - margin,
				east: ne.lng() + margin,
			}
			StationService.update_rect(rect, VORONOI_SIZE_TH)
		}
	}

	onMapDragStart(props?: IMapProps, map?: google.maps.Map) {
		const nav = this.props.nav
		if (isStationDialog(nav) && nav.data.show_high_voronoi) return
		if (nav.type === NavType.DIALOG_LINE && nav.data.show_polyline) return
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
		Actions.setNavStateIdle()
	}

	focusAt(pos: Utils.LatLng) {
		if (!StationService.initialized) return
		const nav = this.props.nav
		if (isStationDialog(nav) && nav.data.show_high_voronoi) return

		Actions.requestShowPosition(pos)

	}

	focusAtNearestStation(pos: Utils.LatLng) {
		if (!StationService.initialized) return
		const nav = this.props.nav
		if (isStationDialog(nav) && nav.data.show_high_voronoi) return
		StationService.update_location(pos, this.props.radar_k, 0).then(s => {
			console.log("update location", s)
			if (s) this.showStation(s)
		})
	}


	showStation(station: Station) {
		Actions.requestShowStation(station)
	}

	showLine(line: Line) {
		Actions.requestShowLine(line)
	}

	moveToCurrentPosition(pos: google.maps.LatLng | null) {
		Actions.setNavStateIdle()

		if (pos && this.map) {
			this.map.panTo(pos)
		}
	}

	render() {
		const nav = this.props.nav
		const clicked_marker = nav.type === NavType.DIALOG_SELECT_POS ? nav.data.dialog.props.position : undefined
		const station_maker = isStationDialog(nav) ? nav.data.dialog.props.station.position : undefined
		const show_voronoi = !this.state.hide_voronoi && !(isStationDialog(nav) && nav.data.show_high_voronoi)
		const polyline = nav.type === NavType.DIALOG_LINE && nav.data.show_polyline ? nav.data : null
		const high_voronoi = isStationDialog(nav) && nav.data.show_high_voronoi ? this.state.high_voronoi : null
		const show_station_pin = !this.state.hide_pin && this.props.show_station_pin && nav.type === NavType.IDLE && show_voronoi
		return (
			<div className='Map-container'>
				<div className='Map-relative' ref={this.map_ref}>

					<Map
						google={this.props.google}
						zoom={14}
						initialCenter={{ lat: 35.681236, lng: 139.767125 }}
						onReady={this.onMapReady.bind(this)}
						onClick={this.onMapClicked.bind(this)}
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
						{this.props.show_current_position && this.state.current_position ? (
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
						{this.props.show_current_position
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
						{this.props.show_current_position && this.state.current_position ? (
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
						{show_voronoi ? this.props.voronoi.map((s, i) => (
							<Polygon
								key={i}
								paths={s.voronoi_points}
								strokeColor="#0000FF"
								strokeWeight={1}
								strokeOpacity={0.8}
								fillOpacity={0.0}
								clickable={false} />
						)) : null}
						{show_station_pin ? this.props.voronoi.map((s, i) => (
							<Marker
								key={i}
								position={s.position}
								icon={pin_station}>
							</Marker>
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
						in={isDialog(nav)}
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
					
					<CSSTransition
						in={this.props.show_current_position}
						className="Dialog-container current-position"
						timeout={400}>
						<div className="Dialog-container current-position">
							<div className="Dialog-frame">
								{this.props.nav.type === NavType.IDLE && this.props.nav.data.dialog !== null ? this.renderInfoDialog() : null}
							</div>
						</div>
					</CSSTransition>
					<div className="menu mylocation">
						<img
							src={ic_mylocation}
							className="icon mylocation"
							onClick={() => {
								if (this.props.show_current_position) {
									this.moveToCurrentPosition(this.state.current_position)
								} else {
									this.onInfoDialogClosed()
									StationService.get_current_position().then(pos => {
										this.moveToCurrentPosition(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude))
									})
								}
							}}></img>
					</div>

				</div>
			</div>

		)
	}

	renderInfoDialog(): any {
		var dom: any = null
		var info = this.props.nav
			switch (info?.data?.dialog?.type) {
				case DialogType.LINE: {
					dom = (
						<LineDialog
							info={info.data.dialog}
							onStationSelected={this.showStation.bind(this)}
							onClosed={this.onInfoDialogClosed.bind(this)}
							onShowPolyline={this.showPolyline.bind(this)} />
					)
					break
				}
				case DialogType.STATION:
				case DialogType.SELECT_POSITION: {
					dom = (
						<StationDialog
							info={info.data.dialog}
							onStationSelected={this.showStation.bind(this)}
							onLineSelected={this.showLine.bind(this)}
							onClosed={this.onInfoDialogClosed.bind(this)}
							onShowVoronoi={this.showRadarVoronoi.bind(this)} />
					)
					break
				}
				case DialogType.CURRENT_POSITION: {
					dom = (
						<CurrentPosDialog
							info={info.data.dialog}
							onStationSelected={this.showStation.bind(this)}
							onLineSelected={this.showLine.bind(this)}/>
					)
					break
				}
				default:
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


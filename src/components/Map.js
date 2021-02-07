import {GoogleApiWrapper, Map, Marker, Polygon, Polyline, Circle} from "google-maps-react";
import React from "react";
import "./Map.css";
import {StationDialog, LineDialog} from "./InfoDialog";
import ProgressBar from "./ProgressBar";
import StationService from "../script/StationService";
import {CSSTransition} from "react-transition-group";
import * as Rect from "../script/Rectangle";
import Data from "../script/DataStore";
import pin_station from "../img/map_pin_station.svg";
import pin_location from "../img/map_pin.svg";
import * as Utils from "../script/Utils";
import VoronoiWorker from "worker-loader!./../script/VoronoiWorker";  // eslint-disable-line import/no-webpack-loader-syntax


const VORONOI_COLOR = [
	"#0000FF",
	"#00AA00",
	"#FF0000",
	"#CCCC00"
];

const ZOOM_TH = 10;
const VORONOI_SIZE_TH = 500;

export class MapContainer extends React.Component {

	constructor(){
		super();
		this.state = {
			show_current_position: Data.getData().watch_position,
			current_position: null,
			current_accuracy: 0,
			clicked_marker:{
				position: null,
				visible: false,
			},
			station_marker:[],
			info_dialog:{
				visible: false,
				type: null,
			},
			map_bounds: null,
			voronoi: [],
			voronoi_show: true,
			high_voronoi_show: false,
			high_voronoi: [],
			worker_running: false,
			polyline_show: false,
			polyline_list: [],
			radar_k: Data.getData().radar_k,
			screen_wide: false,
		};
		this.map_ref = React.createRef();
	}

	componentDidMount(){
		
		StationService.initialize().then( service => {
			if ( this.map ){
				this.onBoundsChanged(null, this.map, true);
			}
		});
		// set callback invoked when radar 'k' is changed
		Data.on("onRadarKChanged", this.onRadarKChanged.bind(this));
		Data.on("onCurrentPositionChanged", this.onCurrentPositionChanged.bind(this));
		Data.on("onWatchPositionChanged", this.showCurrentPosition.bind(this));
		Data.on("onShowStationItemRequested", this.onShowStationItem.bind(this));
		// set callback invoked when screen resized
		this.screenResizedCallback = this.onScreenResized.bind(this);
		window.addEventListener("resize", this.screenResizedCallback);
		this.onScreenResized();
	}

	componentWillUnmount(){
		StationService.release();
		this.map = null;
		Data.removeAllListeners("onRadarKChanged");
		Data.removeAllListeners("onCurrentPositionChanged");
		Data.removeAllListeners("onWatchPositionChanged");
		Data.removeAllListeners("onShowStationItemRequested");
		window.removeEventListener("resize", this.screenResizedCallback);
	}

	onRadarKChanged(k){
		var type = this.state.info_dialog.type;
		if ( type && type === "station" ){
			var pos = this.state.info_dialog.station.position;
			if ( this.state.info_dialog.location ){
				pos = this.state.info_dialog.location.pos;
			}
			StationService.update_location(pos, k, 0).then( () => {
				this.setState(Object.assign({}, this.state, {
					radar_k: k,
					info_dialog: Object.assign({}, this.state.info_dialog, {
						radar_list: this.makeRadarList(pos, k),
					})
				}));
			});
		}else{
			this.setState(Object.assign({}, this.state, {
				radar_k: k
			}));
		}
	}

	onShowStationItem(item){
		switch(item.type){
			case "station": {
				if ( item.station ){
					this.showStation(item.station);
				} else {
					StationService.get_station(item.code, true).then( s => {
						this.showStation(s);
					});
				}
				break;
			}
			case "line": {
				if ( item.line ){
					this.showLine(item.line);
				} else {
					StationService.get_line_detail(item.code).then( line => {
						this.showLine(line);
					})
				}
				break;
			}
			default:
		}
	}

	onCurrentPositionChanged(pos){
		this.setState(Object.assign({}, this.state, {
			current_position: {
				lat: pos.coords.latitude,
				lng: pos.coords.longitude
			},
			current_accuracy: pos.coords.accuracy,
			current_heading: pos.coords.heading,
		}));
	}

	showCurrentPosition(enable){
		this.setState(Object.assign({}, this.state, {
			show_current_position: enable,
		}));
	}

	onScreenResized(){
		var wide = window.innerWidth >= 900;
		console.log("resize", window.innerWidth, wide);
		if ( wide !== this.state.screen_wide ){
			this.setState(Object.assign({}, this.state, {
				screen_wide: wide,
			}));
		}
	}

	showRadarVoronoi(station){
		if ( this.state.worker_running ){
			console.log("worker is running");
			return;
		}
		if (this.state.high_voronoi_show) {
			this.setState(Object.assign({}, this.state, {
				high_voronoi_show: false,
				voronoi_show: true,
			}));
			return;
		}
		const worker = new VoronoiWorker();
		const service = StationService;
		// register callback so that this process can listen message from worker
		worker.addEventListener('message', messaage => {
			var data = JSON.parse(messaage.data);
			if ( data.type === 'points' ){
				// point provide
				service.get_station(data.code, true).then( s => {
					return Promise.all(
						s.next.map(code => service.get_station(code, true))
					);
				}).then(stations => {
					var points = stations.map(s => {
						var point = {
							x: s.position.lng,
							y: s.position.lat,
							code: s.code
						};
						return point;
					});
					worker.postMessage(JSON.stringify({
						type: 'points',
						code: data.code,
						points: points,
					}));
				});
			} else if ( data.type === 'progress' ){
				var list = this.state.high_voronoi;
				list.push(data.polygon);
				this.setState(Object.assign({}, this.state, {
					high_voronoi: list
				}));
			} else if ( data.type === 'complete' ){
				worker.terminate();
				this.setState(Object.assign({}, this.state, {
					worker_running: false,
				}));
				this.worker = null;
				if ( this.map ){
					var rect = this.map_ref.current.getBoundingClientRect();
					var bounds = Utils.get_bounds(this.state.high_voronoi[this.state.radar_k-1]);
					var [center, zoom] = Utils.get_zoom_property(bounds, rect.width, rect.height, ZOOM_TH, station.position, 100);
					this.map.panTo(center);
					this.map.setZoom(zoom);
				}
			} else if ( data.type === "error" ){
				console.error('fail to calc voronoi', data.err);
				worker.terminate();
				this.setState(Object.assign({}, this.state, {
					worker_running: false,
					voronoi_show: true,
					high_voronoi_show: false,
				}));
				this.worker = null;
			}
		});

		var boundary = Rect.init(127, 46, 146, 26);
		var container = Rect.getContainer(boundary);
		var center = {
			x: station.position.lng,
			y: station.position.lat,
			code: station.code,
		};
		this.setState(Object.assign({}, this.state, {
			high_voronoi_show: true,
			high_voronoi: [],
			voronoi_show: false,
			polyline_show: false,
			worker_running: true,
		}));
		this.worker = worker;
		worker.postMessage(JSON.stringify({
			type: 'start',
			container: container,
			k: this.state.radar_k,
			center: center,
		}));
		
		
	}

	showPolyline(line){
		if ( !line.has_details || !this.map) return;
		var polyline = undefined;
		var bounds = undefined;
		if ( line.polyline_list ){
			polyline = line.polyline_list;
			bounds = line;
		} else {
			var data = Utils.get_bounds(line.station_list);
			polyline = [data];
			bounds = data;
		}
		this.setState(Object.assign({}, this.state, {
			polyline_show: true,
			polyline_list: polyline,
			high_voronoi_show: false,
			voronoi_show: true,
			station_marker: line.station_list.map(s => {
				return {
					position: s.position
				}
			})
		}));
		var rect = this.map_ref.current.getBoundingClientRect();
		var [center, zoom] = Utils.get_zoom_property(bounds, rect.width, rect.height);
	
		this.map.panTo(center);
		this.map.setZoom(zoom);
		console.log('zoom to', zoom, center, line);
	}

	getUIEvent(clickEvent){
		// googlemap onClick などのコールバック関数に渡させるイベントオブジェクトの中にあるUIEventを抽出
		// property名が謎
		// スマホではTouchEvent, マウスでは MouseEvent
		for ( var p in clickEvent){
			if ( clickEvent[p] instanceof  UIEvent ) return clickEvent[p];
		}
		return null;
	}

	onMouseDown(event) {
		this.mouse_event = this.getUIEvent(event);
		//console.log('mousedown', this.mouse_event, event);
	}

	onMapReady(props,map){
		console.log("map ready", props);
		map.addListener("mousedown", this.onMouseDown.bind(this));
		this.map = map;
		this.map.setOptions({
			// this option can not be set via props in google-maps-react
			mapTypeControlOptions: {
				position: this.props.google.maps.ControlPosition.TOP_RIGHT,
				style: this.props.google.maps.MapTypeControlStyle.DROPDOWN_MENU
			}
		});
		StationService.get_current_position().then(pos => {
			var latlng = {
				lat: pos.coords.latitude,
				lng: pos.coords.longitude
			};
			this.map.setCenter(latlng);
			this.setState(Object.assign({}, this.state, {
				current_position: latlng,
			}));
		}).catch(err => {
			console.log(err);
		});

	}

	onMapRightClicked(props,map,event){

		const pos = {
			lat: event.latLng.lat(),
			lng: event.latLng.lng()
		};
		//console.log("right click", pos, event);
		this.focusAt(pos);
	}

	onMapClicked(props,map,event){
		const pos = {
			lat: event.latLng.lat(),
			lng: event.latLng.lng()
		};
		if ( this.mouse_event && this.getUIEvent(event).timeStamp - this.mouse_event.timeStamp > 300 ){
			console.log("map long clicked", pos, event);
			this.focusAt(pos);
		}else{
			console.log("map clicked", event);
			this.focusAtNearestStation(pos);
		}
	}

	onMapZoomChanged(props,map,e){
		console.log("zoom", map.getZoom());
	}


	onBoundsChanged(props,map,idle=false){
		var bounds = map.getBounds();
		if ( !bounds ) return;
		var ne = bounds.getNorthEast();
		var sw = bounds.getSouthWest();
		//console.log(ne.lat(), ne.lng(), sw.lat(), sw.lng());
		var rect = {
			south: sw.lat(),
			north: ne.lat(),
			west: sw.lng(),
			east: ne.lng()
		};
		if ( this.solved_bounds && !idle){
			var inside = StationService.inside_rect(rect, this.solved_bounds);
			var width1 = rect.east - rect.west;
			var height1 = rect.north - rect.south;
			var width2 = this.solved_bounds.east - this.solved_bounds.west;
			var height2 = this.solved_bounds.north - this.solved_bounds.south;
			if ( !inside || width1 < width2/6 || height1 < height2/6  ){
				this.updateBounds(rect);
			} 
		}else{
			this.updateBounds(rect);
		}
	}

	onMapIdle(props,map){
		//console.log("idle");
		this.onBoundsChanged(props,map,true);
	}

	updateBounds(rect){
		//console.log("updateBounds", rect);
		if ( StationService.initialized ){
			const margin_width = Math.min(rect.east - rect.west, 0.5);
			const margin_height = Math.min(rect.north - rect.south, 0.5);
			const bounds = {
				north: rect.north + margin_height,
				south: rect.south - margin_height,
				east: rect.east + margin_width,
				west: rect.west - margin_width
			};
			const zoom = this.map.getZoom();
			const limit = zoom < ZOOM_TH ? VORONOI_SIZE_TH : undefined; 
			StationService.update_rect(bounds, limit).then( list => {
				this.setState(Object.assign({}, this.state, {
					voronoi: list,
					voronoi_show: !this.state.high_voronoi_show && (zoom >= ZOOM_TH || list.length < VORONOI_SIZE_TH),
				}));
			});
			this.solved_bounds = bounds;
		}
	}

	onMapDragStart(props,map){
		if (this.state.high_voronoi_show) return;
		if ( this.state.polyline_show) return;
		if ( !this.state.screen_wide ) {
			this.onInfoDialogClosed();
		}
	}

	onInfoDialogClosed(){
		// if any worker is running, terminate it
		if ( this.state.worker_running && this.worker ){
			this.worker.terminate();
			this.worker = null;
			console.log("worker terminated");
		}
		this.setState(Object.assign({}, this.state, {
			clicked_marker: {
				visible: false
			},
			worker_running: false,
			station_marker: [],
			info_dialog: Object.assign({}, this.state.info_dialog, {
				visible: false
			}),
			high_voronoi_show: false,
			polyline_show: false,
			voronoi_show: this.state.voronoi.length < VORONOI_SIZE_TH || this.map.getZoom() >= ZOOM_TH,
		}));
	}

	focusAt(pos){
		if ( !StationService.initialized ) return;
		if ( this.state.high_voronoi_show ) return;
		StationService.update_location(pos,this.state.radar_k,0).then( station => {

			if (this.map) {
				this.map.panTo(pos);
				if (this.map.getZoom() < 14) this.map.setZoom(14);
			}
			this.setState(Object.assign({}, this.state, {
				clicked_marker: {
					visible: true,
					position: pos
				}, 
				station_marker: [{
					position: station.position
				}],
				info_dialog: {
					visible: true,
					type: "station",
					station: station,
					radar_list: this.makeRadarList(pos),
					prefecture: StationService.get_prefecture(station.prefecture),
					location: {
						pos: pos,
						dist: StationService.measure(station.position, pos)
					}
				},
				polyline_show: false,
				high_voronoi_show: false,
			}));		
		});
		
	}

	focusAtNearestStation(pos){
		if ( !StationService.initialized ) return;
		if (this.state.high_voronoi_show) return;
		StationService.update_location(pos, this.state.radar_k,0).then( s => {
			console.log("update location", s);
			this.showStation(s);
		});
	}

	makeRadarList(pos,k){
		if ( !k ) k = this.state.radar_k;
		return StationService.tree.getNearStations(k).map(s => {
			return {
				station: s,
				dist: StationService.measure(s.position, pos),
				lines: s.lines.map(code => StationService.get_line(code).name).join(' '),
			};
		});
	}

	showStation(station){
		StationService.update_location(station.position, this.state.radar_k, 0).then( () => {

			this.setState(Object.assign({}, this.state, {
				info_dialog: {
					visible: true,
					type: "station",
					station: station,
					radar_list: this.makeRadarList(station.position),
					prefecture: StationService.get_prefecture(station.prefecture),
					lines: station.lines.map( code => StationService.get_line(code)),
				},
				clicked_marker: {
					visible: false
				},
				station_marker: [{
					position: station.position,
				}],
				polyline_show: false,
				high_voronoi_show: false,
			}));
			if ( this.map ){
				this.map.panTo(station.position);
				if ( this.map.getZoom() < 14 ) this.map.setZoom(14);
			}
		});
	}

	showLine(line){
		this.setState(Object.assign({}, this.state, {
			info_dialog: {
				visible: true,
				type: "line",
				line: line,
				line_details: false,
			},
			clicked_marker: {
				visible: false
			},
			station_marker: [],
			polyline_show: false,
			high_voronoi_show: false,
		}));
		StationService.get_line_detail(line.code).then( l => {
			this.setState(Object.assign({}, this.state, {
				info_dialog: {
					visible: true,
					type: "line",
					line: l,
					line_details: true,
				},
			}));
		});
	}

	render(){
		return(
			<div className='Map-container'>
				<div className='Map-relative' ref={this.map_ref}>

						<Map className='Map' 
							google={this.props.google}
							zoom={14}
							initialCenter={{ lat: 35.681236, lng: 139.767125 }}
							onReady={this.onMapReady.bind(this)}
							onClick={this.onMapClicked.bind(this)}
							onBounds_changed={this.onBoundsChanged.bind(this)}
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
								visible={this.state.clicked_marker.visible}
								position={this.state.clicked_marker.position}
								icon={pin_location} >
								</Marker>
							{this.state.station_marker.map( (marker,i) => (
								<Marker
									key={i}
									position={marker.position}
									icon={pin_station}>
								</Marker>
							))}
							{this.state.voronoi_show ? this.state.voronoi.map( (s,i) => (
								<Polygon
									key={i}
									paths={s.voronoi_points}
									strokeColor="#0000FF"
									strokeWeight={1}
									strokeOpacity={0.8}
									fillOpacity={0.0}
									clickable={false}/>
							)) : null}
							{this.state.high_voronoi_show ? this.state.high_voronoi.map((points,i) => (
								<Polygon
									key={i}
									paths={points}
									strokeColor={(i===this.state.radar_k-1)?"#000000":VORONOI_COLOR[i%VORONOI_COLOR.length]}
									strokeWeight={1}
									strokeOpacity={0.8}
									fillOpacity={0.0}
									clickable={false} />
							)) : null}
							{this.state.polyline_show ? this.state.polyline_list.map((p,i)=>(
								<Polyline
									key={i}
									path={p.points}
									strokeColor="#FF0000"
									strokeWeight={2}
									strokeOpacity={0.8}
									fillOpacity={0.0}
									clickable={false}/>
							)) : null}
						</Map>
						
						<CSSTransition
							in={this.state.info_dialog.visible}
							className="Dialog-container"
							timeout={400}>
							<div className="Dialog-container">
								<div className="Dialog-frame">

								{this.state.info_dialog.type === "station" ? (
									<StationDialog
										station={this.state.info_dialog.station}
										radar_k={this.state.radar_k}
										radar_list={this.state.info_dialog.radar_list}
										prefecture={this.state.info_dialog.prefecture}
										lines={this.state.info_dialog.lines}
										location={this.state.info_dialog.location}
										onClosed={this.onInfoDialogClosed.bind(this)}
										onShowVoronoi={this.showRadarVoronoi.bind(this)}/>
								) : (this.state.info_dialog.type === "line" ? (
									<LineDialog
										line={this.state.info_dialog.line}
										line_details={this.state.info_dialog.line_details}
										onClosed={this.onInfoDialogClosed.bind(this)}
										onShowPolyline={this.showPolyline.bind(this)} />
									) : null)}
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
}

const LoadingContainer = (props) => (
	<div className='Map-container'>Map is loading...</div>
);

export default GoogleApiWrapper({
	apiKey: process.env.REACT_APP_API_KEY,
	language: "ja",
	LoadingContainer: LoadingContainer,
})(MapContainer);
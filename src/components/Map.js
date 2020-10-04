import {GoogleApiWrapper, Map, Marker, Polygon, Polyline} from "google-maps-react";
import React from "react";
import "./Map.css";
import {StationDialog, LineDialog} from "./InfoDialog";
import {StationService} from "../script/StationService";
import {CSSTransition} from "react-transition-group";
import * as Rect from "../script/Rectangle";
import Data from "../script/DataStore";
import pin_station from "../img/map_pin_station.svg";
import pin_location from "../img/map_pin.svg";

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
			current_position:{
				lat: null,
				lng: null
			},
			clicked_marker:{
				position: null,
				visible: false,
			},
			station_marker:{
				position: null,
				visible: false,
			},
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
		
		new StationService().initialize().then( service => {
			this.service = service;
			if ( this.map ){
				this.onBoundsChanged(null, this.map, true);
			}
		});
		// set callback invoked when radar 'k' is changed
		this.radarChangedCallback = this.onRadarKChanged.bind(this);
		Data.on("onRadarKChanged", this.radarChangedCallback);
		this.onRadarKChanged();
		// set callback invoked when screen resized
		this.screenResizedCallback = this.onScreenResized.bind(this);
		window.addEventListener("resize", this.screenResizedCallback);
		this.onScreenResized();
	}

	componentWillUnmount(){
		this.service.release();
		this.map = null;
		Data.removeListener("onRadarKChanged", this.radarChangedCallback);
		window.removeEventListener("resize", this.screenResizedCallback);
	}

	onRadarKChanged(){
		var type = this.state.info_dialog.type;
		var k = Data.getData().radar_k;
		if ( type && type === "station" ){
			var pos = this.state.info_dialog.station.position;
			if ( this.state.info_dialog.location ){
				pos = this.state.info_dialog.location.pos;
			}
			this.service.update_location(pos, k, 0).then( () => {
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
		const worker = new Worker(`${process.env.PUBLIC_URL}/VoronoiWorker.js`);
		const service = this.service;
		worker.addEventListener('error', err => {
			console.error('error', err);
			worker.terminate();
		});
		worker.addEventListener('message', messaage => {
			var data = JSON.parse(messaage.data);
			if ( data.type === 'points' ){
				// point provide
				Promise.resolve(data.code).then(code => {
					var s = service.get_station(code);
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
		worker.postMessage(JSON.stringify({
			type: 'start',
			container: container,
			k: this.state.radar_k,
			center: center,
		}));
		
		
	}

	showPolyline(line){
		if ( !line.has_details || !this.map) return;
		this.setState(Object.assign({}, this.state, {
			polyline_show: true,
			polyline_list: line.polyline_list,
			high_voronoi_show: false,
			voronoi_show: true,
		}));
		var center = {
			lat: (line.south + line.north)/2,
			lng: (line.east + line.west)/2
		};
		var rect = this.map_ref.current.getBoundingClientRect();
		var zoom = Math.floor(Math.log2(Math.min(360 / (line.north - line.south) * rect.width / 256, 180 / (line.east - line.west) * rect.height / 256)));
		this.map.panTo(center);
		this.map.setZoom(zoom);
		console.log('zoom to', zoom, center);
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
				position: this.props.google.maps.ControlPosition.TOP_RIGHT
			}
		});
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				this.setState(Object.assign({}, this.state, {
					current_position: {
						lat: pos.coords.latitude,
						lng: pos.coords.longitude
					}
				}));
				console.log("current position", pos.coords);
			},
			(err) => {
				console.log(err);
			}
		);
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
			var inside = this.service.inside_rect(rect, this.solved_bounds);
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
		if ( this.service ){
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
			this.service.update_rect(bounds, limit).then( list => {
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
		this.setState(Object.assign({}, this.state, {
			clicked_marker: {
				visible: false
			},
			station_marker: {
				visible: false,
			},
			info_dialog: Object.assign({}, this.state.info_dialog, {
				visible: false
			}),
			high_voronoi_show: false,
			polyline_show: false,
			voronoi_show: this.state.voronoi.length < VORONOI_SIZE_TH || this.map.getZoom() >= ZOOM_TH,
		}));
	}

	focusAt(pos){
		if ( this.state.high_voronoi_show ) return;
		this.service.update_location(pos,this.state.radar_k,0).then( s => {
			this.showPosition(pos,s);
		});
		
	}

	focusAtNearestStation(pos){
		if (this.state.high_voronoi_show) return;
		this.service.update_location(pos, this.state.radar_k,0).then( s => {
			console.log("update location", s);
			this.showStation(s);
		});
	}

	makeRadarList(pos,k){
		if ( !k ) k = this.state.radar_k;
		return this.service.tree.getNearStations(k).map(s => {
			return {
				station: s,
				dist: this.service.measure(s.position, pos),
				lines: s.lines.map(code => this.service.get_line(code).name).join(' '),
			};
		});
	}

	showPosition(pos,station){
		if (this.map) {
			this.map.panTo(pos);
			if (this.map.getZoom() < 14) this.map.setZoom(14);
		}
		this.setState(Object.assign({}, this.state, {
			clicked_marker: {
				visible: true,
				position: pos
			}, 
			station_marker: {
				visible: true,
				position: station.position
			},
			info_dialog: {
				visible: true,
				type: "station",
				station: station,
				radar_list: this.makeRadarList(pos),
				prefecture: this.service.get_prefecture(station.prefecture),
				location: {
					pos: pos,
					dist: this.service.measure(station.position, pos)
				}
			},
			polyline_show: false,
			high_voronoi_show: false,
		}));
	}

	showStation(station){
		this.setState(Object.assign({}, this.state, {
			info_dialog: {
				visible: true,
				type: "station",
				station: station,
				radar_list: this.makeRadarList(station.position),
				prefecture: this.service.get_prefecture(station.prefecture),
				lines: station.lines.map( code => this.service.get_line(code)),
			},
			clicked_marker: {
				visible: false
			},
			station_marker: {
				visible: true,
				position: station.position,
			},
			polyline_show: false,
			high_voronoi_show: false,
		}));
		if ( this.map ){
			this.map.panTo(station.position);
			if ( this.map.getZoom() < 14 ) this.map.setZoom(14);
		}
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
			station_marker: {
				visible: false,
			},
			polyline_show: false,
			high_voronoi_show: false,
		}));
		this.service.get_line_detail(line.code).then( l => {
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
							center={this.state.current_position}
							initialCenter={{ lat: 35.681236, lng: 139.767125 }}
							onReady={this.onMapReady.bind(this)}
							onClick={this.onMapClicked.bind(this)}
							onBounds_changed={this.onBoundsChanged.bind(this)}
							onZoom_changed={this.onMapZoomChanged.bind(this)}
							onDragstart={this.onMapDragStart.bind(this)}
							onRightclick={this.onMapRightClicked.bind(this)}
							onIdle={this.onMapIdle.bind(this)}
							fullscreenControl={false}
							streetViewControl={false}
							zoomControl={true}
							gestureHandling={"greedy"}
							mapTypeControl={true}

						>
							<Marker
								visible={this.state.clicked_marker.visible}
								position={this.state.clicked_marker.position}
								icon={pin_location} >
								</Marker>
							<Marker
								visible={this.state.station_marker.visible}
								position={this.state.station_marker.position}
								icon={pin_station} >
								</Marker>
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
										onShowVoronoi={this.showRadarVoronoi.bind(this)}
										onShowLine={this.showLine.bind(this)} />
								) : (this.state.info_dialog.type === "line" ? (
									<LineDialog
										line={this.state.info_dialog.line}
										line_details={this.state.info_dialog.line_details}
										onClosed={this.onInfoDialogClosed.bind(this)}
										onShowPolyline={this.showPolyline.bind(this)}
										onShowStation={this.showStation.bind(this)} />
									) : null)}
								<CSSTransition
									in={this.state.worker_running}
									className="Dialog-message"
									timeout={0}>
									<div className="Dialog-message">
										<div className="Progress-circle">
											<div className="Progress-circle-inside"></div>
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
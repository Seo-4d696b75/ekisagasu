import {GoogleApiWrapper, Map, Marker, Polygon} from "google-maps-react";
import React from "react";
import * as EventActions from "../Actions";
import "./Map.css";
import {StationDialog, LineDialog} from "./InfoDialog";
import {StationService} from "../script/StationService";
import {CSSTransition} from "react-transition-group";
import * as Rect from "../script/Rectangle";

const VORONOI_COLOR = [
	"#00AA00",
	"#FF0000",
	"#AAAA00",
	"#0000FF"
];

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
				visible: false
			},
			info_dialog:{
				visible: false,
				type: null,
			},
			map_bounds: null,
			solved_bounds: null,
			voronoi: [],
			voronoi_show: true,
			high_voronoi_show: false,
			radar_k: 18,
		}
	}

	componentDidMount(){
		
		new StationService().initialize().then( service => {
			this.service = service;
			if ( this.map ){
				this.onBoundsChanged(null, this.map, true);
			}
		});
	}

	showRadarVoronoi(station){
		if ( this.state.worker_running ){
			console.log("worker is running");
			return;
		}
		if (this.state.high_voronoi_show) {
			this.setState({
				high_voronoi_show: false,
				voronoi_show: true,
			});
			return;
		}
		const worker = new Worker('VoronoiWorker.js');
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
				this.setState({
					high_voronoi: list
				});
			} else if ( data.type === 'complete' ){
				worker.terminate();
				this.setState({
					worker_running: false,
				});
			}
		});

		var boundary = Rect.init(127, 46, 146, 26);
		var container = Rect.getContainer(boundary);
		var center = {
			x: station.position.lng,
			y: station.position.lat,
			code: station.code,
		};
		this.setState({
			high_voronoi_show: true,
			high_voronoi: [],
			voronoi_show: false,
			worker_running: true,
		});
		worker.postMessage(JSON.stringify({
			type: 'start',
			container: container,
			k: this.state.radar_k,
			center: center,
		}));
		
		
	}

	componentWillUnmount(){
		this.service.release();
		this.map = null;
	}


	onMouseDown(event) {
		this.mouse_event = event.tb;
	}

	onMapReady(props,map){
		console.log("map ready", props);
		map.addListener("mousedown", this.onMouseDown.bind(this));
		this.map = map;
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				this.setState({
					current_position: {
						lat: pos.coords.latitude,
						lng: pos.coords.longitude
					}
				});
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
		console.log("right click", pos, event);
		this.focusAt(pos);
	}

	onMapClicked(props,map,event){
		const pos = {
			lat: event.latLng.lat(),
			lng: event.latLng.lng()
		};
		if ( event.tb.timeStamp - this.mouse_event.timeStamp > 300 ){
			console.log("map long clicked", pos, event);
			this.focusAt(pos);
		}else{
			console.log("map clicked", event);
			this.focusAtNearestStation(pos);
		}
	}

	onMapZoomChanged(props,map,e){
		console.log("zoom", e);
	}

	checkShowVoronoi(map){
		var show = !this.state.high_voronoi_show && this.state.voronoi && (map.getZoom() > 10 || this.state.voronoi.length < 200);
		if (show !== this.state.voronoi_show) {
			this.setState({
				voronoi_show: show,
			});
		}
	}

	onBoundsChanged(props,map,idle=false){
		EventActions.setMapBounds(map.getBounds());
		this.checkShowVoronoi(map);
		
		var bounds = map.getBounds();
		var rect = {
			south: bounds.Ya.g,
			north: bounds.Ya.i,
			west: bounds.Ta.g,
			east: bounds.Ta.i
		};
		var pos = {
			lat: (rect.south + rect.north)/2,
			lng: (rect.east + rect.west)/2
		};
		var r = Math.sqrt(
			(rect.north - rect.south) * (rect.north - rect.south) + 
			(rect.east - rect.west) * (rect.east - rect.west)
		) / 2;
		if ( this.state.solved_bounds && !idle){
			var dy = this.state.solved_bounds.center.lat - pos.lat;
			var dx = this.state.solved_bounds.center.lng - pos.lng;
			var dist = Math.sqrt(dx*dx + dy*dy);
			if ( dist > Math.abs(r-this.state.solved_bounds.radius)){
				this.updateLocation(map,pos,r*3);
			} 
		}else{
			this.updateLocation(map,pos,r*3);
		}
	}

	onMapIdle(props,map){
		console.log("idle");
		this.onBoundsChanged(props,map,false);
	}

	updateLocation(map,pos,r){
		console.log("updateLocation",pos,r);
		if ( this.service ){
			
			this.service.tree.setSearchProperty(this.state.radar_k,r);
			this.service.update_location(pos).then(() => {
				var list = this.service.tree.getAllNearStations();
				this.setState({
					voronoi: list,
				});
				this.checkShowVoronoi(map);
			});
			this.setState({
				solved_bounds: {
					center: pos,
					radius: r * 0.7
				}
			});
		}
	}

	onMapDragStart(props,map){
		if (this.state.high_voronoi_show) return;
		this.onInfoDialogClosed();
	}

	onInfoDialogClosed(){
		var state = {
			clicked_marker: {
				visible: false
			},
			info_dialog: Object.assign({}, this.state.info_dialog, {
				visible: false
			})
		};
		if (this.state.high_voronoi_show) {
			state.high_voronoi_show = false;
			state.voronoi_show = true;
		}
		this.setState(state);
	}

	focusAt(pos){
		if ( this.state.high_voronoi_show ) return;
		this.map.panTo(pos);
		this.setState({
			clicked_marker: {
				visible: true,
				position: pos
			},
			//TODO
		});
	}

	focusAtNearestStation(pos){
		if (this.state.high_voronoi_show) return;
		this.service.update_location(pos).then( s => {
			console.log("update location", s);
			this.showStation(s);
		});
	}

	showStation(station){
		this.setState({
			info_dialog: {
				visible: true,
				type: "station",
				station: station,
				radar_list: this.service.tree.getNearStations(this.state.radar_k).map(s => {
					return {
						station: s,
						dist: this.service.measure(s.position, station.position),
						lines: s.lines.map(code => this.service.get_line(code).name).join(' '),
					};
				}),
				prefecture: this.service.get_prefecture(station.prefecture),
				lines: station.lines.map( code => this.service.get_line(code)),
			}
		});
		if ( this.map ){
			this.map.panTo(station.position);
		}
	}

	showLine(line){
		this.setState({
			info_dialog: {
				visible: true,
				type: "line",
				line: line,
				line_details: false,
			}
		});
		this.service.get_line_detail(line.code).then( l => {
			this.setState({
				info_dialog: {
					visible: true,
					type: "line",
					line: l,
					line_details: true,
				}
			});
		});
	}

	render(){
		return(
			<div className='Map-container'>
				<div className='Map-relative'>

						<Map className='Map'
							google={this.props.google}
							zoom={14}
							center={this.state.current_position}
							initialCenter={{ lat: 35.681236, lng: 139.767125 }}
							onReady={this.onMapReady.bind(this)}
							onClick={this.onMapClicked.bind(this)}
							onBounds_changed={this.onBoundsChanged.bind(this)}
							onDragstart={this.onMapDragStart.bind(this)}
							onRightclick={this.onMapRightClicked.bind(this)}
							onIdle={this.onMapIdle.bind(this)}
							fullscreenControl={false}
							streetViewControl={false}
							zoomControl={false}
							gestureHandling={"greedy"}
							mapTypeControl={false}

						>
							<Marker
								visible={this.state.clicked_marker.visible}
								position={this.state.clicked_marker.position}>


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
						</Map>
						<CSSTransition
							in={this.state.info_dialog.visible}
							className="Dialog-container"
							timeout={400}>
							<div className="Dialog-container">

								{this.state.info_dialog.type === "station" ? (
									<StationDialog
										station={this.state.info_dialog.station}
										radar_k={this.state.radar_k}
										radar_list={this.state.info_dialog.radar_list}
										prefecture={this.state.info_dialog.prefecture}
										lines={this.state.info_dialog.lines}
										onClosed={this.onInfoDialogClosed.bind(this)}
										onShowVoronoi={this.showRadarVoronoi.bind(this)}
										onShowLine={this.showLine.bind(this)} />
								) : ( this.state.info_dialog.type === "line" ? (
									<LineDialog
										line={this.state.info_dialog.line}
										line_details={this.state.info_dialog.line_details}
										onClosed={this.onInfoDialogClosed.bind(this)}
										onShowStation={this.showStation.bind(this)}/>
								) : null )}

							
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
	apiKey: "AIzaSyAi5Nv266dJyucThSkO1dtMn0kJdp_16Z0",
	language: "ja",
	LoadingContainer: LoadingContainer,
})(MapContainer);
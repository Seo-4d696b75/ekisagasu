import {GoogleApiWrapper, Map, Marker, Polygon, Polyline} from "google-maps-react";
import React from "react";
import * as EventActions from "../Actions";
import "./Map.css";
import {StationDialog, LineDialog} from "./InfoDialog";
import {StationService} from "../script/StationService";
import {CSSTransition} from "react-transition-group";
import {Delaunay} from "../diagram/Delaunay";
import * as Rect from "../diagram/Rectangle";

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
				station: null,
			},
			service: null,
			map_bounds: null,
			solved_bounds: null,
			voronoi: [],
			voronoi_show: true,
		}
	}

	componentDidMount(){
		
		new StationService().initialize().then( service => {
			this.setState({
				service: service
			});
			if ( this.map ){
				this.onBoundsChanged(null, this.map, true);
			}
		});
	}

	test(){
		var list = [];
		for ( let s of this.state.service.stations.values() ){
			var pos = {x:s.position.lng, y:s.position.lat};
			list.push(pos);
		}
		console.log("list size", list.length, list);
		var delaunay = new Delaunay(list);
		var boundary = Rect.init(125, 50, 145, 30);
		console.log("test init", delaunay, boundary);
		delaunay.split(boundary);
		var edges = [];
		for ( let edge of delaunay.solvedEdge ){
			var start = {lat:edge.a.y, lng:edge.a.x};
			var end = {lat:edge.b.y, lng:edge.b.x};
			edges.push([start, end]);
		}
		this.setState({
			delaunay_show: true,
			delaunay: edges,
		});
	}

	componentWillUnmount(){
		this.state.service.release();
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

	onBoundsChanged(props,map,idle=false){
		EventActions.setMapBounds(map.getBounds());
		var show = map.getZoom() > 10 || this.state.voronoi.length < 200;
		if ( show !== this.state.voronoi_show ){
			this.setState({
				voronoi_show: show,
			});
		}
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
		if ( this.state.service ){
			
			this.state.service.tree.setSearchProperty(18,r);
			this.state.service.tree.updateLocation(pos,() => {
				var list = this.state.service.tree.getAllNearStations();
				var show = map.getZoom() > 10 || list.length < 200;
				this.setState({
					voronoi: list,
					voronoi_show: show,
				});
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
		this.onInfoDialogClosed();
	}

	onInfoDialogClosed(){
		this.setState({
			clicked_marker: {
				visible: false
			},
			info_dialog: Object.assign({}, this.state.info_dialog, {
				visible: false
			})
		});
	}

	focusAt(pos){
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
		this.state.service.tree.updateLocation(pos, s => {
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
		this.state.service.get_line_detail(line.code).then( l => {
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
							{this.state.delaunay_show ? this.state.delaunay.map( (path,i) => (
								<Polyline
									key={i}
									path={path}
									strokeColor="#FF0000"
									strokeWeight={1}
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

								{this.state.info_dialog.type === "station" ? (
									<StationDialog
										station={this.state.info_dialog.station}
										radar_k={18}
										service={this.state.service}
										onClosed={this.onInfoDialogClosed.bind(this)}
										onTest={this.test.bind(this)}
										onShowLine={this.showLine.bind(this)} />
								) : (
									<LineDialog
										line={this.state.info_dialog.line}
										line_details={this.state.info_dialog.line_details}
										service={this.state.service}
										onClosed={this.onInfoDialogClosed.bind(this)}
										onShowStation={this.showStation.bind(this)}/>
								)}

							
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
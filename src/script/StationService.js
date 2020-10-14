import axios from "axios";
import {StationKdTree} from "./KdTree";
import {Station} from "./Station";
import {Line} from  "./Line";
import * as Utils from "./Utils";

const TAG_STATIONS = "all-stations";
const TAG_SEGMENT_PREFIX = "station-segment:";

export class StationService {

	initialize(){

		this.stations = new Map();
		this.lines = new Map();

		// 同一データの非同期取得が重ならないようにスケジューリングする
		this.tasks = new Map();
		return new StationKdTree(this).initialize("root").then( tree =>{
			this.tree = tree;
			return axios.get(`https://raw.githubusercontent.com/Seo-4d696b75/station_database/master/out/line.json`);
		}).then(res => {
			res.data.forEach(d => {
				var line = new Line(d);
				this.lines.set(line.code, line);
			});
		}).then( () => {
			return axios.get('https://raw.githubusercontent.com/Seo-4d696b75/station_database/master/src/prefecture.csv');
		}).then( res => {
			this.prefecture = new Map();
			res.data.split('\n').forEach(line => {
				var cells = line.split(',');
				if ( cells.length === 2 ){
					this.prefecture.set(parseInt(cells[0]), cells[1]);
				}
			});
			console.log('service initialized', this);
			return this;
		})
	}

	release(){
		this.tree.release();
		this.stations.clear();
		this.tasks.clear();
		console.log('service released');
	}

	update_location(position,k,r){
		if ( !k || k <= 0 ) k = 1;
		if ( !r || r < 0 ) r = 0;
		return this.tree.updateLocation(position, k, r);
	}

	update_rect(rect, max){
		if ( max < 1 ) max = 1;
		return this.tree.updateRectRegion(rect, max);
	}

	get_station(code, promise=false){
		if ( promise ){
			var s = this.stations.get(code);
			if ( s ) return Promise.resolve(s);
			var task = this.tasks.get(TAG_STATIONS);
			if ( task && task instanceof Promise ){
				return task.then( () => {
					return this.get_station(code, false);
				});
			} else {
				task = axios.get('https://raw.githubusercontent.com/Seo-4d696b75/station_database/master/out/station.json').then(res => {
					res.data.forEach( item => {
						var code = item['code'];
						if ( !this.stations.has(code) ){
							this.stations.set(code, new Station(item));
						}
					});
					this.tasks.set(TAG_STATIONS, null);
					return this.get_station(code, false);
				});
				this.tasks.set(TAG_STATIONS, task);
				return task;
			}
		}else{
			return this.stations.get(code);
		}
		
	}

	get_line(code){
		return this.lines.get(code);
	}

	get_line_detail(code){
		const line = this.lines.get(code);
		if ( line.has_details) {
			return Promise.resolve(line);
		} else {
			return axios.get(`https://raw.githubusercontent.com/Seo-4d696b75/station_database/master/out/line/${code}.json`).then(res => {
				const data = res.data;
				line.station_list = data["station_list"].map(item => {
					var c = item['code'];
					var s = this.stations.get(c);
					if ( s ) return s;
					s = new Station(item);
					this.stations.set(c, s);
					return s;
				});
				if (data.polyline_list) {
					line.polyline_list = data["polyline_list"].map(d => Utils.parse_polyline(d));
					line.north = data['north'];
					line.south = data['south'];
					line.east = data['east'];
					line.west = data['west'];
				}
				line.has_details = true;
				return line;
			});
		}
	}

	get_prefecture(code){
		return this.prefecture.get(code);
	}

	get_tree_segment(name){
		const tag = `${TAG_SEGMENT_PREFIX}${name}`;
		var task  = this.tasks.get(tag);
		if ( task && task instanceof Promise ){
			return task;
		}
		task = axios.get(`https://raw.githubusercontent.com/Seo-4d696b75/station_database/master/out/tree/${name}.json`).then(res => {
			console.log("tree-segment", name, res.data); 
			const data = res.data;
			data.node_list.filter(e => {
				return !e.segment;
			}).forEach(e => {
				var s = new Station(e);
				this.stations.set(s.code, s);
			});
			this.tasks.set(tag, null);
			return data;
		});
		this.tasks.set(tag, task);
		return task;
	}

	measure(pos1,pos2){
		var lng1 = Math.PI * pos1.lng / 180;
		var lat1 = Math.PI * pos1.lat / 180;
		var lng2 = Math.PI * pos2.lng / 180;
		var lat2 = Math.PI * pos2.lat / 180;
		var lng = (lng1 - lng2)/2;
		var lat = (lat1 - lat2)/2;
		return 6378137.0 * 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(lat),2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(lng),2)));
	}

	inside_rect(position, rect){
		if ( position.lat && position.lng ){
			return (
				position.lat >= rect.south && 
				position.lat <= rect.north &&
				position.lng >= rect.west &&
				position.lng <= rect.east
			);
		} else {
			return (
				position.south >= rect.south
				&& position.north <= rect.north
				&& position.east <= rect.east
				&& position.west >= rect.west
			);
		}
	}

}

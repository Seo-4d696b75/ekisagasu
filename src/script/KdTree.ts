import {LatLng, RectBounds} from "./Utils"
import {Station} from "./Station"
import { StationService } from "./StationService"

class StationNode{

	depth: number
	code: number
	region: RectBounds

	constructor(depth: number, data: any, tree: StationKdTree, data_map: Map<number,any>, region: RectBounds){
		this.depth = depth;
		this.code = data.code;
		this.region = region;
		this.build(data,tree,data_map);
	}

	segment_name: string | null = null
	tree: StationKdTree | null = null

	station: Station | null = null
	left: StationNode | null = null
	right: StationNode | null = null

	build(data: any, tree: StationKdTree, data_map: Map<number,any>){
		if (data.segment) {
			this.segment_name = data.segment;
			this.tree = tree;
			this.station = null;
			//tree.unknown_region.push(this);
		} else {
			this.station = tree.service.get_station_immediate(this.code);
			if (!this.station){
				console.error("station not found", this.code);
				return;
			} 
			if (!tree.service.inside_rect(this.station.position, this.region) ){
				console.error("station pos out of bouuds", this.station, this.region);
				return;
			}
			const x = (this.depth % 2 === 0);
			if (data.left ) {
				var left = data_map.get(data.left);
				if (!left) console.error("node not found", data.left);
				var left_region = {
					north: x ? this.region.north : this.station.position.lat,
					south: this.region.south,
					east: x ? this.station.position.lng : this.region.east,
					west: this.region.west 
				};
				this.left = new StationNode(this.depth + 1, left, tree, data_map, left_region);
			}
			if (data.right ) {
				var right = data_map.get(data.right);
				if (!right) console.error("node not found", data.right);
				var right_region = {
					north: this.region.north,
					south: x ? this.region.south : this.station.position.lat,
					east: this.region.east,
					west: x ? this.station.position.lng : this.region.west
				};
				this.right = new StationNode(this.depth + 1, right, tree, data_map, right_region);
			}
		}
	}

	release(){
		this.tree = null;
		this.station = null;
		if ( this.left ) this.left.release();
		if ( this.right ) this.right.release();
		this.left = null;
		this.right = null;
	}

	async get(): Promise<Station>{
		if (!this.station) {
			if (!this.tree) throw Error("no tree assigned for initializing")
			if (!this.segment_name) throw Error("no segment-name not found")
			const tree = this.tree
			return tree.service.get_tree_segment(this.segment_name).then(data => {
				if (data.root !== this.code) {
					return Promise.reject(`root mismatch. name:${this.segment_name}`);
				} else {
					var map = new Map();
					data.node_list.forEach(element => {
						map.set(element.code, element);
					});
					this.build(map.get(this.code), tree, map);
					if ( this.station ){
						return this.station;
					}else{
						return Promise.reject(`fail to get station:${this.code}`);
					}			
				}
			});
		} else {
			return Promise.resolve(this.station);
		}
		
	}

}

export interface NearStation {
	station: Station
	dist: number
}

export class StationKdTree{

	service: StationService
	//unknown_region: Array<StationNode> = []
	root: StationNode | null = null

	constructor(service: any){
		this.service = service;
	}

	async initialize(root_name: string): Promise<StationKdTree>{
		//this.unknown_region = [];
		return this.service.get_tree_segment(root_name).then(data => {
			var map = new Map<number,any>();
			data.node_list.forEach(element => {
				map.set(element.code, element);
			});
			var regin = {
				north: 90,
				south: -90,
				east: 180,
				west: -180,
			};
			this.root = new StationNode(0, map.get(data.root), this, map, regin);
			console.log("Kd-tree initialized.", this);
			return this;
		});
	}

	release(){
		if ( this.root ){
			this.root.release();
			this.root = null;
		}
	}

	last_position: LatLng | null = null
	current_station: Station | null = null
	search_list: Array<NearStation> = []

	/**
	 * 指定した座標の近傍探索. k, r による探索範囲はorで解釈
	 * @param {*} position 探索の中心
	 * @param {*} k 中心からk番目に近い近傍まで探索
	 * @param {*} r 中心からの距離r以内の近傍まで探索
	 * @returns {Promise} resolve -> 近い順にソートされた近傍の配列
	 */
	async updateLocation(position: LatLng, k: number, r: number = 0): Promise<Station|null>{
		if (k < 1) {
			return Promise.reject(`invalid k:${k}`);
		} else if (!this.service) {
			return Promise.reject('sevrvice not initialized');
		} else if ( !this.root ) {
			return Promise.reject('tree root not initialized');
		} else if ( this.last_position && this.last_position.lat === position.lat && this.last_position.lng === position.lng ){
			console.log("update skip");
			return Promise.resolve(this.current_station);
		} else {
			const time = performance.now();
			return Promise.resolve().then(() => {
				this.search_list = [];
				return this.search(this.root as StationNode, position, k, r);
			}).then(() => {
				this.current_station = this.search_list[0].station;
				this.last_position = position;
				console.log(`update done. k=${k} r=${r} time=${performance.now()-time}ms size:${this.search_list.length}`);
				return this.current_station;
			});
		}
	}

	async updateRectRegion(rect: RectBounds, max: number): Promise<Array<Station>>{
		if (!this.service) {
			return Promise.reject('sevrvice not initialized');
		} else if ( !this.root ) {
			return Promise.reject('tree root not initialized');
		} else {
			const time = performance.now();
			const dst: Array<Station> = [];
			return this.search_rect(this.root, rect, dst, max).then( () => {
				console.log(`update region done. time=${performance.now() - time}ms size:${dst.length}`);
				return dst;
			});
		}
	}

	getAllNearStations(): Array<Station>{
		return this.search_list.map(e => e.station);
	}

	getNearStations(size: number): Array<Station>{
		if ( !this.search_list ) return [];
		if ( size < 0 ) size = 0;
		if ( size > this.search_list.length ) size = this.search_list.length;
		return this.search_list.slice(0,size).map(e=>e.station);
	}

	measure(p1: LatLng, p2: LatLng): number{
		var lat = p1.lat - p2.lat;
		var lng = p1.lng - p2.lng;
		return Math.sqrt(lat*lat + lng*lng);
	}

	search(node: StationNode, position: LatLng, k: number, r: number){
		const div: {value: number, threshold: number} = {
			value: 0,
			threshold: 0
		}

		return node.get().then(s => {
			const d = this.measure(position, s.position);
			var index = -1;
			var size = this.search_list.length;
			if (size > 0 && d < this.search_list[size - 1].dist) {
				index = size - 1;
				while (index > 0) {
					if (d >= this.search_list[index - 1].dist) break;
					index -= 1;
				}
			} else if (size === 0) {
				index = 0;
			}
			if (index >= 0) {
				var e = {
					dist: d,
					station: s
				};
				this.search_list.splice(index, 0, e);
				if (size >= k && this.search_list[size].dist > r) {
					this.search_list.pop();
				}
			}
			var x = (node.depth % 2 === 0);
			div.value = ( x ? position.lng : position.lat);
		  	div.threshold = (x ? s.position.lng : s.position.lat);

			var next = (div.value < div.threshold) ? node.left : node.right;
			if (next) {
				return this.search(next, position, k, r);
			}
		}).then(() => {
			var value = div.value;
			var th = div.threshold;
			var next = (value < th) ? node.right : node.left;
			var list = this.search_list;
			if (next && Math.abs(value - th) < Math.max(list[list.length - 1].dist, r)) {
				return this.search(next, position, k, r);
			}
			
		});
	}

	async search_rect(node: StationNode, rect: RectBounds, dst: Array<Station>, max: number): Promise<any>{
		return node.get().then( station => {
			
			if ( max && dst.length >= max ){
				return;
			}
			if ( this.service.inside_rect(station.position, rect) ){
				dst.push(station);
			}
			var tasks: Array<Promise<any>> = [];
			// check left
			if ( node.left && (
				(node.depth % 2 === 0 && rect.west < station.position.lng)
				|| (node.depth % 2 === 1 && rect.south < station.position.lat)
			) ){
				tasks.push(this.search_rect(node.left, rect, dst, max));
			} 
			// check right
			if ( node.right && (
				(node.depth % 2 === 0 && station.position.lng < rect.east)
				|| (node.depth % 2 === 1 && station.position.lat < rect.north)
			) ){
				tasks.push(this.search_rect(node.right, rect, dst, max));
			}
			return Promise.all(tasks);
		});
	}
	

}
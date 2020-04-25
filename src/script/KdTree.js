

class StationNode{

	constructor(depth,data,service,data_map){
		this.depth = depth;
		this.code = data.code;
		this.build(data,service,data_map);
	}

	build(data,service,data_map){
		if (data.segment) {
			this.segment_name = data.segment;
			this.service = service;
			this.station = null;
		} else {
			this.station = service.get_station(this.code);
			if (!this.station){
				console.error("station not found", this.code);
				return;
			} 
			if (data.left ) {
				var left = data_map.get(data.left);
				if (!left) console.error("node not found", data.left);
				this.left = new StationNode(this.depth + 1, left, service, data_map);
			}
			if (data.right ) {
				var right = data_map.get(data.right);
				if (!right) console.error("node not found", data.right);
				this.right = new StationNode(this.depth + 1, right, service, data_map);
			}
		}
	}

	release(){
		this.service = null;
		this.station = null;
		if ( this.left ) this.left.release();
		if ( this.right ) this.right.release();
		this.left = null;
		this.right = null;
	}

	get(){
		if (!this.station) {
			return this.service.get_tree_segment(this.segment_name).then(data => {
				if (data.root !== this.code) {
					return Promise.reject(`root mismatch. name:${this.segment_name}`);
				} else {
					var map = new Map();
					data.node_list.forEach(element => {
						map.set(element.code, element);
					});
					this.build(map.get(this.code), this.service, map);
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

export class StationKdTree{

	constructor(service){
		this.service = service;
	}

	initialize(root_name){
		return this.service.get_tree_segment(root_name).then(data => {
			var map = new Map();
			data.node_list.forEach(element => {
				map.set(element.code, element);
			});
			this.root = new StationNode(0, map.get(data.root), this.service, map);
			console.log("Kd-tree initialized.", this);
			return this;
		});
	}

	release(){
		if ( this.root ){
			this.root.release();
			this.root = null;
		}
		this.service = null;
	}

	setSearchProperty(k,r){
		this.k = k;
		this.r = r;
	}

	updateLocation(position){
		if (this.k < 1) {
			return Promise.reject(`invalid k:${this.k}`);
		} else if (!this.service) {
			return Promise.reject('sevrvice not initialized');
		} else if ( !this.root ) {
			return Promise.reject('tree root not initialized');
		} else if ( !this.last_position && this.last_position === position ){
			return Promise.resolve(this.current_station);
		} else {
			const time = performance.now();
			return Promise.resolve().then(() => {
				this.position = position;
				this.search_list = [];
				return this.search(this.root);
			}).then(() => {
				this.current_station = this.search_list[0].station;
				this.last_position = position;
				console.log(`update done. k=${this.k} r=${this.r} time=${performance.now()-time}ms size:${this.search_list.length}`);
				return this.current_station;
			});
		}
	}

	getAllNearStations(){
		return this.search_list.map(e => e.station);
	}

	getNearStations(size){
		if ( !this.search_list ) return [];
		if ( size < 0 ) size = 0;
		if ( size > this.search_list.length ) size = this.search_list.length;
		return this.search_list.slice(0,size).map(e=>e.station);
	}

	measure(p1,p2){
		var lat = p1.lat - p2.lat;
		var lng = p1.lng - p2.lng;
		return Math.sqrt(lat*lat + lng*lng);
	}

	search(node){
		const div = {
			value: null,
			threshold: null
		};

		return node.get().then(s => {
			const d = this.measure(this.position, s.position);
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
				if (size >= this.k && this.search_list[size].dist > this.r) {
					this.search_list.pop();
				}
			}
			var x = (node.depth % 2 === 0);
			div.value = ( x ? this.position.lng : this.position.lat);
		  	div.threshold = (x ? s.position.lng : s.position.lat);

			var next = (div.value < div.threshold) ? node.left : node.right;
			if (next) {
				return this.search(next);
			}
		}).then(() => {
			var value = div.value;
			var th = div.threshold;
			var next = (value < th) ? node.right : node.left;
			var list = this.search_list;
			if (next && Math.abs(value - th) < Math.max(list[list.length - 1].dist, this.r)) {
				return this.search(next);
			}
			
		});
	}
	

}

export class Polyline{

	constructor(data){
		this.start = data['start'];
		this.end = data['end'];
		const scale = 100000.0;
		var lng = Math.round(data['lng'] * scale);
		var lat = Math.round(data['lat'] * scale);
		var deltaX = data['delta_lng'];
		var deltaY = data['delta_lat'];
		this.points = deltaX.map ( (dx,i) => {
			var dy = deltaY[i];
			lng += dx;
			lat += dy;
			return {
				lat: lat / scale,
				lng: lng / scale,
			};
		});
	}

}

export class Line{

	constructor(data){
		this.code = data['code'];
		this.name = data['name'];
		this.name_kana = data['name_kana'];
		this.station_size = data['station_size'];
		if ( data['color'] ){
			this.color = data['color'];
		}else{
			this.color = '#CCCCCC';
		}
		this.has_details = false;
	}

}
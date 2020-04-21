
export class Station{

	constructor(data){
		this.code = data['code'];
		this.name = data['name'];
		this.position = {
			lat: data['lat'],
			lng: data['lng']
		};
		this.name_kana = data['name_kana'];
		this.prefecture = data['prefecture'];
		this.lines = data['lines'];
		this.next = data['next'];

		const voronoi = data['voronoi'];
		var lat = voronoi['lat'];
		var lng = voronoi['lng'];
		var deltaX = voronoi['delta_lng'];
		var deltaY = voronoi['delta_lat'];
		const scale = 1.0 / 1000000;
		this.voronoi_points = deltaX.map((e,i)=>{
			lng += (e * scale);
			lat += (deltaY[i] * scale);
			return {
				lat: lat,
				lng: lng
			};
		});
		if (typeof voronoi['enclosed'] === 'undefined' || !!voronoi['enclosed'] ){
			this.voronoi_points.push(this.voronoi_points[0]);
		}
	}


}
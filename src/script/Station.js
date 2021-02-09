
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
		this.voronoi_points = []
		if ( voronoi['type'] !== 'Feature' ){
			console.error("invalide voronoi data", voronoi)
			return
		} 
		const geo = voronoi['geometry']
		if ( geo['type'] === 'Polygon' ){
			this.voronoi_points = geo["coordinates"][0].map( e => {
				return { lat: e[1], lng: e[0]}
			})
		} else if ( geo['type'] === 'LineString' ){
			this.voronoi_points = geo["coordinates"].map( e => {
				return { lat: e[1], lng: e[0]}
			})
		} else {
			console.error("invalide voronoi geometry", geo)
		}
		
	}


}
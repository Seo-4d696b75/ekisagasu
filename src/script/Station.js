
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
		if ( voronoi['type'] !== 'Feature' ) console.error("invalide voronoi data", voronoi)
		const geo = voronoi['geometry']
		if ( geo['type'] !== 'Polygon' ) console.error("invalide voronoi geometry", geo)
		this.voronoi_points = geo["coordinates"][0].map( e => {
			return { lat: e[1], lng: e[0]}
		})
	}


}
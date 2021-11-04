import { LatLng } from "./Utils"

export class Station {

	code: number
	id: string
	name: string
	position: LatLng
	name_kana: string
	prefecture: number
	lines: number[]
	next: number[]
	voronoi_points: Array<LatLng[]>

	constructor(data: any) {
		this.code = data['code']
		this.id = data['id']
		this.name = data['name']
		this.position = {
			lat: data['lat'],
			lng: data['lng']
		}
		this.name_kana = data['name_kana']
		this.prefecture = data['prefecture']
		this.lines = data['lines']
		this.next = data['next']
		this.voronoi_points = []

		const voronoi = data['voronoi']
		if (voronoi['type'] !== 'Feature') {
			console.error("invalid voronoi data", voronoi)
			return
		}
		const geo = voronoi['geometry']
		switch (geo['type']) {
			case 'Polygon':
				this.voronoi_points = geo["coordinates"][0].map(e => {
					return { lat: e[1], lng: e[0] }
				})
				break
			case 'LineString':
				this.voronoi_points = geo["coordinates"].map(e => {
					return { lat: e[1], lng: e[0] }
				})
				break
			default:
				console.error("invalid voronoi geometry", geo)
		}

	}


}
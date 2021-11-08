import { Station } from "./Station"
import { PolylineProps } from "./Utils"

export class Line {

	id: string
	code: number
	name: string
	name_kana: string
	station_size: number
	color: string

	has_details: boolean

	station_list: Array<Station> = []
	polyline_list: Array<PolylineProps> = []
	north: number = 90
	south: number = 0
	east: number = 180
	west: number = 0

	constructor(data) {
		this.id = data['id']
		this.code = data['code']
		this.name = data['name']
		this.name_kana = data['name_kana']
		this.station_size = data['station_size']
		if (data['color']) {
			this.color = data['color']
		} else {
			this.color = '#CCCCCC'
		}
		this.has_details = false
	}

}
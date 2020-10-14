
export class Line {

	constructor(data) {
		this.code = data['code'];
		this.name = data['name'];
		this.name_kana = data['name_kana'];
		this.station_size = data['station_size'];
		if (data['color']) {
			this.color = data['color'];
		} else {
			this.color = '#CCCCCC';
		}
		this.has_details = false;
	}

}
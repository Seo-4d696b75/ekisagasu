import React from "react";
import "./InfoDialog.css";
import img_station from "../img/station.png";
import img_delete from "../img/ic_delete.png";
import img_voronoi from "../img/voronoi.png";
import img_radar from "../img/radar.png";
import img_above from "../img/ic_above.png";
import img_line from "../img/ic_line.png";
import img_location from "../img/ic_location.png";
import { CSSTransition } from "react-transition-group";
import * as Actions from "../script/Actions";

function onLineSelected(line) {
	console.log("line selected", line);
	Actions.requestShowStationItem(line)
}

function onStationSelected(station) {
	console.log("station selected", station);
	Actions.requestShowStationItem(station)
}

export class StationDialog extends React.Component {

	constructor() {
		super();
		this.state = {
			show_radar: false,
		};
	}

	onClosed() {
		this.props.onClosed();
	}

	onRadarShow() {
		console.log("show radar")
		this.setState({
			show_radar: true,
		});
	}

	onRadarClose() {
		this.setState({
			show_radar: false,
		});
	}

	onShowVoronoi(station) {
		this.props.onShowVoronoi(station);
	}

	formatDistance(dist) {
		if (dist < 1000.0) {
			return `${dist.toFixed(0)}m`;
		} else {
			return `${(dist / 1000).toFixed(1)}km`;
		}
	}

	render() {
		const station = this.props.station;
		return (
			<div className="Info-dialog">

				<div className="Container-fixed station">
					<div className="Container-main">

						<div className="Title-container station">
							<p className="Title-name">{station.name}</p>
							<p className="Title-name kana">{station.name_kana}</p>
						</div>
						<div className="Horizontal-container">
							<img src={img_station} alt="icon-details" className="Icon-station" />
							<div className="Station-details">
								所在：{this.props.prefecture}<br />
				        場所：E{station.position.lng} N{station.position.lat}
							</div>
						</div>
						{this.props.lines ? (
							<div className="Scroll-container lines">

								<table>
									<tbody>

										{this.props.lines.map((line, index) => {
											return (
												<tr key={index}
													onClick={onLineSelected.bind(this,line)}
													className="List-cell line">
													<td className="Line-item icon"><div className="Icon-line" style={{ backgroundColor: line.color }} /></td>
													<td className="Line-item line">{line.name}&nbsp;&nbsp;<small>{line.station_size}駅</small></td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

						) : (this.props.location ? (
							<div className="Horizontal-container">
								<img src={img_location} alt="icon-details" className="Icon-station" />
								<div className="Station-details">
									距離：{this.formatDistance(this.props.location.dist)}<br />
				        			選択：E{this.props.location.pos.lng.toFixed(6)} N{this.props.location.pos.lat.toFixed(6)}
								</div>
							</div>
						) : null)}

					</div>
					<div className="Button-container">
						<img
							src={img_delete}
							alt="close dialog"
							className="Icon-action close"
							onClick={this.onClosed.bind(this)} /><br/>
						<img
							onClick={this.onShowVoronoi.bind(this, station)}
							src={img_voronoi}
							alt="show voronoi"
							className="Icon-action" /><br />
						<img
							onClick={this.onRadarShow.bind(this)}
							src={img_radar}
							alt="show radar"
							className="Icon-action radar" />
					</div>
				</div>
				<CSSTransition
					in={this.state.show_radar}
					className="Container-radar"
					timeout={400}>
					<div className="Container-radar">
						<div className="Container-main">

							<div className="Horizontal-container">
								<img src={img_radar} alt="icon-radar" className="Icon-radar" />
								<div className="Radar-k">x{this.props.radar_k}</div>
							</div>
							<div className="Scroll-container radar">

								<table>
									<tbody>

										{this.props.radar_list.map((e, index) => {
											var dist = this.formatDistance(e.dist);
											return (
												<tr key={index} className="List-cell station"
													onClick={onStationSelected.bind(this, e.station)}>
													<td className="Radar-item index">{index + 1}</td>
													<td className="Radar-item dist">{dist}</td>
													<td className="Radar-item station">{e.station.name}&nbsp;&nbsp;{e.lines}</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
						<div className="Bottom-container radar">
							<img
								src={img_above}
								alt="close radar"
								className="Icon-action"
								onClick={this.onRadarClose.bind(this)} />
						</div>
						
						
					</div>
				</CSSTransition>
			</div>
		);

	}
}

export class LineDialog extends React.Component {


	constructor() {
		super();
		this.state = {
			expand_stations: false,
		};
	}

	onClosed() {
		this.props.onClosed();
	}

	toggleStationList(e) {
		console.log("toggle station list", e.target.checked);
		this.setState({
			expand_stations: e.target.checked
		});
	}

	showPolyline(line) {
		console.log("polyline", line);
		if (line.has_details) {
			this.props.onShowPolyline(line);
		}
	}

	render() {
		const line = this.props.line;
		return (
			<div className="Info-dialog">
				<div className="Container-fixed line">
					<div className="Container-main">
						<div className="Horizontal-container">
							<div className="Icon-line big" style={{ backgroundColor: line.color }}></div>
							<div className="Title-container line">
								<p className="Title-name">{line.name}</p>
								<p className="Title-name kana">{line.name_kana}</p>
							</div>
						</div>

						<div className="Horizontal-container">
							<img src={img_station} alt="icon-details" className="Icon-station" />
							<div className="Station-details">
								登録駅一覧
							</div>
						</div>


					</div>
					<div className="Button-container">
						<img
							src={img_delete}
							alt="close dialog"
							className="Icon-action"
							onClick={this.onClosed.bind(this)} />
						<img
							src={img_line}
							alt="show polyline"
							onClick={this.showPolyline.bind(this, line)}
							className="Icon-action" />
					</div>
				</div>
				<CSSTransition
					in={this.state.expand_stations}
					className="Container-stations"
					timeout={400}>
					<div className="Container-stations">

						{this.props.line_details ? (
							<div className="Scroll-container stations">
								<table>
									<tbody>

										{line.station_list.map((station, index) => {
											return (
												<tr key={index}
													onClick={onStationSelected.bind(this, station)}
													className="List-cell station">
													<td className="Station-cell">
														<span className="Station-item name">{station.name}</span>&nbsp;
														<span className="Station-item name-kana">{station.name_kana}</span>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						) : (
								<p>Now Loading...</p>
							)}

						<div className="Bottom-container">
							<div className="Icon-action toggle">
								<input type="checkbox" id="toggle-list" onChange={this.toggleStationList.bind(this)}></input>
								<label className="toggle-button" htmlFor="toggle-list">
								</label>

							</div>
						</div>
					</div>

				</CSSTransition>
			</div>
		);

	}


}
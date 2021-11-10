import React from "react";
import "./InfoDialog.css";
import img_station from "../img/station.png";
import img_delete from "../img/ic_delete.png";
import img_voronoi from "../img/voronoi.png";
import img_radar from "../img/radar.png";
import img_above from "../img/ic_above.png";
import img_line from "../img/ic_line.png";
import img_location from "../img/map_pin.svg";
import img_mylocation from "../img/pin_mylocation.png"
import { CSSTransition } from "react-transition-group";
import { Station } from "../script/Station";
import { StationDialogProps, LineDialogProps, DialogType } from "./Map"
import { Line } from "../script/Line";

interface StationInfoProps {
	info: StationDialogProps
	onClosed: (() => any)
	onLineSelected: ((line: Line) => any)
	onStationSelected: ((s: Station) => any)
	onShowVoronoi?: ((s: Station) => any)
}

interface StationInfoState {
	show_radar: boolean
}

export class StationDialog extends React.Component<StationInfoProps, StationInfoState> {

	state = {
		show_radar: false,
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

	onShowVoronoi(station: Station) {
		if (this.props.onShowVoronoi) {
			this.props.onShowVoronoi(station);
		}
	}

	formatDistance(dist: number) {
		if (dist < 1000.0) {
			return `${dist.toFixed(0)}m`;
		} else {
			return `${(dist / 1000).toFixed(1)}km`;
		}
	}

	render() {
		const info = this.props.info
		const station = info.props.station
		return (
			<div className="Info-dialog">

				<div className={`Container-fixed station ${info.type === DialogType.STATION ? null : "position"}`}>
					<div className="Container-main">

						<div className="Title-container station">
							<p className="Title-name">{station.name}</p>
							<p className="Title-name kana">{station.name_kana}</p>
						</div>
						<div className="Horizontal-container">
							<img src={img_station} alt="icon-details" className="Icon-station" />
							<div>
								<div className="Station-details">
									{info.props.prefecture}
								</div>
								<div className="Station-details location">
									E{station.position.lng} N{station.position.lat}
								</div>
							</div>
						</div>
						{info.type === DialogType.SELECT_POSITION ? (
							<div className="Horizontal-container position">
								<img src={img_location}
									alt="icon-details"
									className="Icon-station" />
								<div className="Station-details">
									<div className="Horizontal-container">
										<div className="position-title">&nbsp;選択した地点&nbsp;</div>
										<img className="arrow-right" src={img_above}/>
										<div className="station-distance">{this.formatDistance(info.props.dist)}</div>
									</div>
									E{info.props.position.lng.toFixed(6)} N{info.props.position.lat.toFixed(6)}
								</div>
							</div>
						) : null}
						{info.type === DialogType.CURRENT_POSITION ? (
							<div className="Horizontal-container position">
								<img src={img_mylocation}
									alt="icon-details"
									className="Icon-station" />
								<div className="Station-details">
									<div className="Horizontal-container">
										<div className="position-title">&nbsp;現在位置 &nbsp;</div>
										<img className="arrow-right" src={img_above}/>
										<div className="station-distance">{this.formatDistance(info.props.dist)}</div>
									</div>
									E{info.props.position.lng.toFixed(6)} N{info.props.position.lat.toFixed(6)}
								</div>
							</div>
						) : null}
						<div className={`Scroll-container lines ${info.type === DialogType.STATION ? null : "position"}`}>

							<table>
								<tbody>

									{info.props.lines.map((line, index) => {
										return (
											<tr key={index}
												onClick={() => this.props.onLineSelected(line)}
												className="List-cell line">
												<td className="Line-item icon"><div className="Icon-line" style={{ backgroundColor: line.color }} /></td>
												<td className="Line-item line">{line.name}&nbsp;&nbsp;<small>{line.station_size}駅</small></td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

					</div>
					<div className="Button-container">
						<img
							src={img_delete}
							alt="close dialog"
							className="Icon-action close"
							onClick={this.onClosed.bind(this)} /><br />
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
								<div className="Radar-k">x{info.props.radar_list.length}</div>
							</div>
							<div className="Scroll-container radar">

								<table>
									<tbody>

										{info.props.radar_list.map((e, index) => {
											var dist = this.formatDistance(e.dist);
											return (
												<tr key={index} className="List-cell station"
													onClick={() => this.props.onStationSelected(e.station)}>
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


interface LineInfoProps {
	info: LineDialogProps
	onClosed: (() => any)
	onStationSelected: ((s: Station) => any)
	onShowPolyline: ((line: Line) => any)
}

interface LineInfoState {
	expand_stations: boolean
}

export class LineDialog extends React.Component<LineInfoProps, LineInfoState> {


	state = {
		expand_stations: false
	}

	onClosed() {
		this.props.onClosed();
	}

	toggleStationList(e: React.ChangeEvent<HTMLInputElement>) {
		console.log("toggle station list", e.target.checked);
		this.setState({
			expand_stations: e.target.checked
		});
	}

	showPolyline(line: Line) {
		console.log("polyline", line);
		if (line.has_details) {
			this.props.onShowPolyline(line);
		}
	}

	render() {
		const info = this.props.info.props
		const line = info.line
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

						{info.line_details ? (
							<div className="Scroll-container stations">
								<table>
									<tbody>

										{line.station_list.map((station, index) => {
											return (
												<tr key={index}
													onClick={() => this.props.onStationSelected(station)}
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
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
import { StationDialogProps, LineDialogProps, DialogType, CurrentPosDialogProps } from "./Map"
import { Line } from "../script/Line";

function formatDistance(dist: number): string {
	if (dist < 1000.0) {
		return `${dist.toFixed(0)}m`;
	} else {
		return `${(dist / 1000).toFixed(1)}km`;
	}
}

function renderStationTitle(station: Station) {
	return (
		<div className="title-container station">
			<p className="title-name">{station.name}</p>
			<p className="title-name kana">{station.name_kana}</p>
		</div>
	)
}

function renderStationDetails(info: StationDialogProps, onLineSelected: (line: Line) => void) {
	const station = info.props.station
	return (
		<div className={`container-main station-detail ${info.type === DialogType.SELECT_POSITION ? 'position' : ''}`}>
			<div className="horizontal-container">
				<img src={img_station} alt="icon-details" className="icon-station" />
				<div>
					<div className="container-description">
						{info.props.prefecture}
					</div>
					<div className="container-description location">
						E{station.position.lng} N{station.position.lat}
					</div>
				</div>
			</div>

			{info.type === DialogType.SELECT_POSITION ? (
				<div className="horizontal-container position">
					<img src={img_location}
						alt="icon-details"
						className="icon-station" />
					<div className="container-description">
						<div className="horizontal-container">
							<div className="position-title">&nbsp;選択した地点&nbsp;</div>
							<img className="arrow-right" src={img_above} />
							<div className="station-distance">{formatDistance(info.props.dist)}</div>
						</div>
						E{info.props.position.lng.toFixed(6)} N{info.props.position.lat.toFixed(6)}
					</div>
				</div>
			) : null}
			{info.type === DialogType.CURRENT_POSITION ? (
				<div className="horizontal-container position">
					<img src={img_mylocation}
						alt="icon-details"
						className="icon-station" />
					<div className="container-description">
						<div className="horizontal-container">
							<div className="position-title">&nbsp;現在位置 &nbsp;</div>
							<img className="arrow-right" src={img_above} />
							<div className="station-distance">{formatDistance(info.props.dist)}</div>
						</div>
						E{info.props.position.lng.toFixed(6)} N{info.props.position.lat.toFixed(6)}
					</div>
				</div>
			) : null}
			<div className={`scroll-container lines ${info.type === DialogType.STATION ? null : "position"}`}>

				<table>
					<tbody>
						{info.props.lines.map((line, index) => {
							return (
								<tr key={index}
									onClick={() => onLineSelected(line)}
									className="list-cell line">
									<td className="line-item icon"><div className="icon-line" style={{ backgroundColor: line.color }} /></td>
									<td className="line-item line">{line.name}&nbsp;&nbsp;<small>{line.station_size}駅</small></td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	)
}

function renderStationRadar(info: StationDialogProps, show: boolean, onStationSelected: (s: Station) => void, onClose: () => void) {
	return (
		<div className={`container-main radar ${info.type === DialogType.STATION ? "" : "position"}`}>
			<CSSTransition
				in={show}
				className="container-expand radar"
				timeout={400}>
				<div className="container-expand radar">
					<div className="horizontal-container radar-title">
						<img src={img_radar} alt="icon-radar" className="icon-radar" />
						<div className="radar-k">x{info.props.radar_list.length}</div>
					</div>
					<div className="scroll-container radar">
						<table>
							<tbody>
								{info.props.radar_list.map((e, index) => {
									var dist = formatDistance(e.dist);
									return (
										<tr key={index} className="list-cell station"
											onClick={() => onStationSelected(e.station)}>
											<td className="radar-item index">{index + 1}</td>
											<td className="radar-item dist">{dist}</td>
											<td className="radar-item station">{e.station.name}&nbsp;&nbsp;{e.lines}</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
					<div className="bottom-container radar">
						<img
							src={img_above}
							alt="close radar"
							className="icon-action"
							onClick={() => onClose()} />
					</div>
				</div>
			</CSSTransition>
		</div>

	)
}

interface CurrentPosInfoProps {
	info: CurrentPosDialogProps
	onLineSelected: ((line: Line) => any)
	onStationSelected: ((s: Station) => any)
}

interface CurrentPosInfoState {
	show_radar: boolean
	show_details: boolean
}

export class CurrentPosDialog extends React.Component<CurrentPosInfoProps, CurrentPosInfoState> {
	state = {
		show_radar: false,
		show_details: true,
	}

	toggleStationDetails(show: boolean) {
		this.setState({
			...this.state,
			show_details: show,
			show_radar: false,
		})
	}

	onRadarShow() {
		this.setState({
			...this.state,
			show_radar: true,
		})
	}

	onRadarClose() {
		this.setState({
			...this.state,
			show_radar: false,
		})
	}

	render() {
		const info = this.props.info
		const station = info.props.station
		return (
			<div className="info-dialog">
				<div className="container-main station-title">
					{renderStationTitle(station)}
					<div className="button-container">
						{this.state.show_details ? (
							<img
								src={img_delete}
								alt="close dialog"
								className="icon-action close current-pos"
								onClick={() => this.toggleStationDetails(false)} />
						) : (
							<img
								src={img_above}
								alt="close dialog"
								className="icon-action expand"
								onClick={() => this.toggleStationDetails(true)} />
						)}
						<br />
						{this.state.show_details ? (
							<img
								onClick={this.onRadarShow.bind(this)}
								src={img_radar}
								alt="show radar"
								className="icon-action radar" />
						) : null}
					</div>
				</div>
				<CSSTransition
					in={this.state.show_details}
					className="container-expand station-detail"
					timeout={400}>
					<div className="container-expand station-detail">
						{renderStationDetails(info, this.props.onLineSelected)}
					</div>
				</CSSTransition>
				{renderStationRadar(info, this.state.show_radar, this.props.onStationSelected, this.onRadarClose.bind(this))}
			</div>
		);
	}
}

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
		console.log("show radar list")
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

	render() {
		const info = this.props.info
		const station = info.props.station
		return (
			<div className="info-dialog">

				<div className="container-main station-title">
					{renderStationTitle(station)}

					<div className="button-container">
						<img
							src={img_delete}
							alt="close dialog"
							className="icon-action close"
							onClick={this.onClosed.bind(this)} /><br />
						<img
							onClick={this.onShowVoronoi.bind(this, station)}
							src={img_voronoi}
							alt="show voronoi"
							className="icon-action" /><br />
						<img
							onClick={this.onRadarShow.bind(this)}
							src={img_radar}
							alt="show radar"
							className="icon-action radar" />
					</div>
				</div>

				{renderStationDetails(info, this.props.onLineSelected)}
				{renderStationRadar(info, this.state.show_radar, this.props.onStationSelected, this.onRadarClose.bind(this))}
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
			<div className="info-dialog">
				<div className="container-main line">
					<div className="horizontal-container">
						<div className="icon-line big" style={{ backgroundColor: line.color }}></div>
						<div className="title-container line">
							<p className="title-name">{line.name}</p>
							<p className="title-name kana">{line.name_kana}</p>
						</div>
					</div>

					<div className="horizontal-container">
						<img src={img_station} alt="icon-details" className="icon-station" />
						<div className="container-description">
							登録駅一覧
						</div>
					</div>

					<div className="button-container">
						<img
							src={img_delete}
							alt="close dialog"
							className="icon-action"
							onClick={this.onClosed.bind(this)} />
						<img
							src={img_line}
							alt="show polyline"
							onClick={this.showPolyline.bind(this, line)}
							className="icon-action" />
					</div>
				</div>
				<CSSTransition
					in={this.state.expand_stations}
					className="container-accordion station-list"
					timeout={400}>
					<div className="container-accordion station-list">

						{info.line_details ? (
							<div className="scroll-container stations">
								<table>
									<tbody>

										{line.station_list.map((station, index) => {
											return (
												<tr key={index}
													onClick={() => this.props.onStationSelected(station)}
													className="list-cell station">
													<td className="station-cell">
														<span className="station-item name">{station.name}</span>&nbsp;
														<span className="station-item name-kana">{station.name_kana}</span>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						) : (
							<p className="container-description loading-mes">Now Loading...</p>
						)}

						<div className="bottom-container">
							<div className="icon-action toggle">
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
import React from "react";
import "./InfoDialog.css";
import img_station from "../img/station.png";
import img_delete from "../img/ic_delete.png";
import img_voronoi from "../img/voronoi.png";
import img_radar from "../img/radar.png";
import img_above from "../img/ic_above.png";
import { CSSTransition } from "react-transition-group";


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

	onLineSelected(line){
		console.log("line selected",line);
		this.props.onShowLine(line);
	}

	onShowRadar(station){
		this.props.onShowRadar(station);
	}

	render() {
		const station = this.props.station;
		return (
			<div className="Info-dialog">

				<div className="Container-fixed">
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
						<div className="Scroll-container lines">
							<table>
								<tbody>

									{this.props.lines.map((line, index) => {
										return (
											<tr key={index} 
												onClick={this.onLineSelected.bind(this, line)}
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
					<img
						src={img_delete}
						alt="close dialog"
						className="Icon-action close"
						onClick={this.onClosed.bind(this)} />
					<div className="Button-container">
						<img
							onClick={this.onShowRadar.bind(this, station)}
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
											var dist = e.dist < 1000.0 ? `${e.dist.toFixed(0)}m` : `${(e.dist / 1000).toFixed(1)}km`;
											return (
												<tr key={index}>
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
						<div className="Button-container">
							<img
								src={img_above}
								alt="close radar"
								className="Icon-action radar"
								onClick={this.onRadarClose.bind(this)} />
						</div>
					</div>
				</CSSTransition>
			</div>
		);

	}
}

export class LineDialog extends React.Component {



	onClosed() {
		this.props.onClosed();
	}

	onStationSelected(station){
		console.log("station selected", station);
		this.props.onShowStation(station);
	}

	render() {
		const line = this.props.line;
		return (
			<div className="Info-dialog">

				<div className="Container-fixed">
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
						{this.props.line_details ? (
							<div className="Scroll-container stations">
								<table>
									<tbody>

										{line.station_list.map((station, index) => {
											return (
												<tr key={index}
													onClick={this.onStationSelected.bind(this, station)}
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

						
					</div>
					<img
						src={img_delete}
						alt="close dialog"
						className="Icon-action close"
						onClick={this.onClosed.bind(this)} />
					<div className="Button-container">
						<img
							src={img_voronoi}
							alt="show voronoi"
							className="Icon-action" /><br />
						<img
							src={img_radar}
							alt="show radar"
							className="Icon-action radar" />
					</div>
				</div>
			</div>
		);

	}


}
import React from "react";
import * as Action from "../script/Actions";
import "./Header.css"
import img_setting from "../img/ic_settings.png";
import img_delete from "../img/ic_delete.png";
import img_help from "../img/ic_help.png";
import { CSSTransition } from "react-transition-group";
import { Link } from "react-router-dom";

export default class Header extends React.Component {

	constructor() {
		super();
		this.state = {
			show_setting: false,
		};
	}

	showSetting() {
		this.setState({
			show_setting: true,
		});
	}

	closeSetting() {
		this.setState({
			show_setting: false,
		});
	}

	onRadarKChanged(e) {
		console.log("on change", e.target.value);
		Action.setRadarK(e.target.value);
	}

	showHelp() {

	}

	render() {
		return (
			<div className='Map-header'>
				<div className="Header-frame">

					<div className="App-title">駅サガース</div>
					<div className="Action-container">
						<Link to="/help" target="_blank">
							<img className="Action-button help"
								src={img_help}
								alt="help"
								onClick={this.showHelp.bind(this)}></img>
						</Link>

						<img className="Action-button setting"
							src={img_setting}
							alt="setting"
							onClick={this.showSetting.bind(this)}></img>
					</div>
				</div>
				<CSSTransition
					in={this.state.show_setting}
					className="Setting-container"
					timeout={400}>

					<div className="Setting-container">
						<div className="Setting-frame">

							<div className="Setting-title radar">レーダ検知数</div>
							<div className="Setting-slider radar">
								<span>12</span>
								<input
									type="range"
									min="12"
									max="18"
									step="1"
									name="radar"
									onChange={this.onRadarKChanged.bind(this)}
									list="radar-list">
								</input><span>18</span>
								<datalist id="radar-list">
									<option value="12" label="12"></option>
									<option value="13"></option>
									<option value="14"></option>
									<option value="15"></option>
									<option value="16"></option>
									<option value="17"></option>
									<option value="18" label="18"></option>
								</datalist>
							</div>
							<img
								src={img_delete}
								alt="close dialog"
								className="Icon-action close"
								onClick={this.closeSetting.bind(this)} />
						</div>
					</div>

				</CSSTransition>
			</div>
		);
	}
}
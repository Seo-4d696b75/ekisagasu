import React from "react";
import * as Action from "../script/Actions";
import "./Header.css"
import img_setting from "../img/ic_settings.png";
import img_delete from "../img/ic_delete.png";
import img_help from "../img/ic_help.png";
import { CSSTransition } from "react-transition-group";
import { Link } from "react-router-dom";
import Data from "../script/DataStore";

export default class Header extends React.Component {

	constructor() {
		super();
		this.state = {
			show_setting: false,
			radar_k: Data.getData().radar_k,
		};
	}

	showSetting() {
		this.setState({
			show_setting: true,
			radar_k: this.state.radar_k,
		});
	}

	closeSetting() {
		this.setState({
			show_setting: false,
			radar_k: this.state.radar_k,
		});
	}

	onRadarKChanged(e) {
		console.log("on change", e.target.value);
		Action.setRadarK(e.target.value);
		this.setState(Object.assign({}, this.state, {
			radar_k: e.target.value
		}));
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
								alt="help"></img>
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
									max="20"
									value={this.state.radar_k}
									step="1"
									name="radar"
									onChange={this.onRadarKChanged.bind(this)}
									list="radar-list">
								</input><span>20</span>
								<datalist id="radar-list">
									<option value="12" label="12"></option>
									<option value="13"></option>
									<option value="14"></option>
									<option value="15"></option>
									<option value="16"></option>
									<option value="17"></option>
									<option value="18"></option>
									<option value="19"></option>
									<option value="20" label="20"></option>
								</datalist>
							</div>
							<img
								src={img_delete}
								alt="close dialog"
								className="Action-close"
								onClick={this.closeSetting.bind(this)} />
						</div>
					</div>

				</CSSTransition>
			</div>
		);
	}
}
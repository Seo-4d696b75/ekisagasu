import React from "react";
import * as Action from "../script/Actions";
import "./Header.css"
import img_search from "../img/ic_search.png";
import img_setting from "../img/ic_settings.png";
import img_delete from "../img/ic_delete.png";
import img_help from "../img/ic_help.png";
import { CSSTransition } from "react-transition-group";
import { Link } from "react-router-dom";
import StationSearchBox from "./StationSearchBox";
import * as Actions from "../script/Actions";
import { Unregister } from "../script/LiveData";
import store from "../script/Store";

interface HeaderState {
	show_setting: boolean
	show_search_box: boolean
	radar_k: number
	show_position: boolean
	high_accuracy: boolean
}

export class Header extends React.Component<{}, HeaderState> {

	state = {
		show_setting: false,
		show_search_box: false,
		radar_k: 0,
		show_position: false,
		high_accuracy: false
	}

	search_ref = React.createRef<StationSearchBox>()
	unregisters: Unregister[] = []

	componentDidMount(){
		this.unregisters = [
			store.radar_k.observe( k => {
				this.setState({
					...this.state,
					radar_k: k
				})
			}),
			store.watch_position.observe( v => {
				this.setState({
					...this.state,
					show_position: v
				})
			}),
			store.high_accuracy.observe( high => {
				this.setState({
					...this.state,
					high_accuracy: high
				})
			})
		]
	}

	componentWillUnmount(){
		this.unregisters.forEach( c => c())
	}

	showSetting() {
		this.setState({
			...this.state,
			show_setting: true
		});
	}

	closeSetting() {
		this.setState({
			...this.state,
			show_setting: false
		});
	}

	onRadarKChanged(e: React.ChangeEvent<HTMLInputElement>) {
		console.log("radar-k chnaged", e.target.value);
		var k = parseInt( e.target.value)
		Action.setRadarK(k);
	}

	onShowPositionChanged(e: React.ChangeEvent<HTMLInputElement>) {
		Action.setWatchCurrentPosition(e.target.checked);
	}

	onPositionAccuracyChanged(e: React.ChangeEvent<HTMLInputElement>) {
		Action.setPositionAccuracy(e.target.checked);
	}

	showSearchBox() {
		if (!this.state.show_search_box) {
			console.log("show search box");
			this.setState({
				...this.state,
				show_search_box: true,
			})
		}
	}

	focusSearchBox() {
		if (this.search_ref.current) {
			this.search_ref.current.focus()
		}
	}

	showStationItem(item: any) {
		Actions.requestShowStationItem(item);
		this.setState({
			...this.state,
			show_search_box: false,
		})
	}

	render() {
		return (
			<div className='Map-header' >
				<div className="Header-frame" >

					<div className="App-title" > 駅サガース </div>
					< CSSTransition
						in={this.state.show_search_box}
						className="search-box"
						timeout={300}
						onEntered={this.focusSearchBox.bind(this)} >
						<div className="search-box" >
							<StationSearchBox
								ref={this.search_ref}
								onSuggestionSelected={this.showStationItem.bind(this)} > </StationSearchBox>
						</div>
					</CSSTransition>
					< div className="Action-container" >
						<img className="Action-button search"
							src={img_search}
							alt="search"
							style={{ display: this.state.show_search_box ? 'none' : 'inline-block' }
							}
							onClick={this.showSearchBox.bind(this)} > </img>
						< Link to="/help" target="_blank" >
							<img className="Action-button help"
								src={img_help}
								alt="help" > </img>
						</Link>

						< img className="Action-button setting"
							src={img_setting}
							alt="setting"
							onClick={this.showSetting.bind(this)} > </img>
					</div>
				</div>
				< CSSTransition
					in={this.state.show_setting}
					className="Setting-container"
					timeout={400} >

					<div className="Setting-container" >
						<div className="Setting-frame" >

							<img
								src={img_delete}
								alt="close dialog"
								className="Action-button close"
								onClick={this.closeSetting.bind(this)} />

							<div className="Setting-title radar" > レーダ検知数 </div>
							< div className="Setting-slider radar" >
								<span>12 </span>
								< input
									type="range"
									min="12"
									max="20"
									value={this.state.radar_k}
									step="1"
									name="radar"
									onChange={this.onRadarKChanged.bind(this)}
									list="radar-list" >
								</input><span>20</span >
								<datalist id="radar-list" >
									<option value="12" label="12" > </option>
									< option value="13" > </option>
									< option value="14" > </option>
									< option value="15" > </option>
									< option value="16" > </option>
									< option value="17" > </option>
									< option value="18" > </option>
									< option value="19" > </option>
									< option value="20" label="20" > </option>
								</datalist>
							</div>
							< div className="switch-container" >
								<div className="Setting-title position" > 現在位置の表示 </div>
								< div className="toggle-switch position" >
									<input id="toggle-position" className="toggle-input" type='checkbox'
										checked={this.state.show_position} onChange={this.onShowPositionChanged.bind(this)} />
									<label htmlFor="toggle-position" className="toggle-label" />
								</div>
							</div>
							< div className="switch-container" >
								<div className="Setting-title accuracy" > 高精度な位置情報 </div>
								< div className="toggle-switch accuracy" >
									<input id="toggle-accuracy" className="toggle-input" type='checkbox'
										checked={this.state.high_accuracy} onChange={this.onPositionAccuracyChanged.bind(this)} />
									<label htmlFor="toggle-accuracy" className="toggle-label" />
								</div>
							</div>
						</div>
					</div>

				</CSSTransition>
			</div>
		);
	}
}

export default Header
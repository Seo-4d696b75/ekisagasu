import React from "react";
import DataStore from "../DataStore";
import {EVENT} from "../DataStore";
import "./Header.css"

export default class Header extends React.Component {

	constructor(){
		super();
		var data = DataStore.getData();
		this.state = {
			text: data.header_text.value,
			map_bounds: data.map.bounds
		};
		this.onHeaderTextChnagedListener = ()=>{
			this.setState(
				{ text: DataStore.getData().header_text.value }
			);
		};
		this.onMapBoundsChangedListener = ()=>{
			this.setState({
				map_bounds: DataStore.getData().map.bounds
			});
		};
	}

	componentDidMount(){
		DataStore.on(EVENT.HEADER_TEXT_CHANGED, this.onHeaderTextChnagedListener);
		DataStore.on(EVENT.MAP_BOUNDS_CHANGED, this.onMapBoundsChangedListener);
	}

	componentWillUnmount() {
		DataStore.removeListener(EVENT.HEADER_TEXT_CHANGED, this.onHeaderTextChnagedListener);
		DataStore.removeListener(EVENT.MAP_BOUNDS_CHANGED, this.onMapBoundsChangedListener);
	}

	render() {
		return (
		<div className='Map-header'>
					<div className="App-title">{this.state.text}</div>
					<div className="Map-bounds">
						south:{this.state.map_bounds.south} north:{this.state.map_bounds.north}<br/>
						west:{this.state.map_bounds.west} east:{this.state.map_bounds.east}
					</div>
		</div>
		);
	}
}
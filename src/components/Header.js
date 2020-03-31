import React from "react";
import DataStore from "../DataStore";
import {EVENT} from "../DataStore";

export default class Header extends React.Component {

	constructor(){
		super();
		this.state = {
			text: DataStore.getData().header_text.value
		};
		this.onHeaderTextChnagedListener = ()=>{
			this.setState(
				{ text: DataStore.getData().header_text.value }
			);
		};
	}

	componentDidMount(){
		DataStore.on(EVENT.HEADER_TEXT_CHANGED, this.onHeaderTextChnagedListener);
	}

	componentWillUnmount() {
		DataStore.removeListener(EVENT.HEADER_TEXT_CHANGED, this.onHeaderTextChnagedListener);
	}

	render() {
		return (
		<div>{this.state.text}</div>
		);
	}
}
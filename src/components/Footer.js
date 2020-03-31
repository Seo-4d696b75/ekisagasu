import React from "react";
import * as EventActions from "../Actions";

export default class Footer extends React.Component {

	onTextChanged(e) {
		EventActions.setHeaderText(e.target.value);
	}
	onSynClicked() {
		EventActions.setHeaderTextSync();
	}

	render() {
		return (
			<div className='Map-footer'>
				<span>

					<input onChange={this.onTextChanged}></input>
					<button onClick={this.onSynClicked}>Sync</button>
					This pages is made with React.js
				</span>
			</div>
		);
	}
}
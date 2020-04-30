import React from "react";

export default class Footer extends React.Component {

	onTextChanged(e) {
	}
	onSynClicked() {
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
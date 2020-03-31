import React from "react";
import logo from '../logo.svg';
import * as EventActions from "../Actions";

export default class Layout extends React.Component {
	onTextChanged(e){
		EventActions.setHeaderText(e.target.value);
	}
	onImgClicked(){
		EventActions.setHeaderTextSync();
	}
	render() {
		let name = 'hoge';
		return (

			<div>
				<header className="App-header">
					<img src={logo} className="App-logo" alt="logo" onClick={this.onImgClicked}/>
					<p>
						Edit <code>src/App.js</code> and save to reload. Hot reloading is working {name}.
        			</p>
					<a
						className="App-link"
						href="https://reactjs.org"
						target="_blank"
						rel="noopener noreferrer"
					>
						Learn React
        			</a>
					<input onChange={this.onTextChanged}></input>
					<button onClick={this.onImgClicked}>Sync</button>
				</header>
			</div>
		);
	}
}

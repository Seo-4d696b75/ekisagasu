import React from "react";
import logo from '../logo.svg';

export default class Layout extends React.Component {
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
				</header>
			</div>
		);
	}
}

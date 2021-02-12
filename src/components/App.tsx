import React from 'react';
import './App.css';
import Header from './Header'
import Map from './Map'
import Help from './Help'
import { HashRouter, Route } from 'react-router-dom';

export default class APP extends React.Component {

	render() {
		return (
			<div className="App">
				<HashRouter basename='/'>
					<Route exact path='/' render={() =>
						<div>
							<Header></Header>
							<Map></Map>
						</div>
					}></Route>
					<Route path='/help' component={Help}></Route>
				</HashRouter>
			</div>
		)
	}
}

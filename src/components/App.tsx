import React from 'react';
import './App.css';
import Header from './Header'
import Map from './map/Map'
import Help from './Help'
import { HashRouter, Route } from 'react-router-dom';
import { Provider } from "react-redux"
import { store } from "../script/store_"

export default class APP extends React.Component {

	render() {
		return (
			<div className="App">
				<HashRouter basename='/'>
					<Route exact path='/' render={(props) => {
						return (
							<div>
								<Provider store={store}>
									<Header></Header>
									<Map></Map>
								</Provider>
							</div>
						)
					}}></Route>
					<Route path='/help' component={Help}></Route>
				</HashRouter>
			</div>
		)
	}
}

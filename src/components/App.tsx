import React from 'react';
import './App.css';
import Header from './Header'
import Map from './Map'
import Help from './Help'
import { HashRouter, Route } from 'react-router-dom';
import { Provider } from "react-redux"
import { store } from "../script/Store"
import qs from "query-string"

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
									<Map query={qs.parse(props.location.search)}></Map>
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

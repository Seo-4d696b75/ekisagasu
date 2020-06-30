import React from 'react';
import './App.css';
import Header from './Header'
import Map from './Map'
import Help from './Help'
import {BrowserRouter, Route} from 'react-router-dom';

export default class APP extends React.Component {
	
	render(){
		return (
			<div className="App">
				<BrowserRouter>
						<Route exact path='/ekisagasu' render={()=>
							<div>
								<Header></Header>
								<Map></Map>
							</div>
						}></Route>
						<Route path='/ekisagasu/help' component={Help}></Route>
				</BrowserRouter>
			</div>
		)
	}
}

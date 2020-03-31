import React from 'react';
import './App.css';
import Header from './components/Header'
import Footer from './components/Footer'
import Map from './components/Map'

export default class APP extends React.Component {
	
	render(){
		return (
			<div className="App">
				<Header ></Header>
				<Map></Map>
				<Footer></Footer>
			</div>
		)
	}
}

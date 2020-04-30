import React from 'react';
import './App.css';
import Header from './Header'
import Footer from './Footer'
import Map from './Map'

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

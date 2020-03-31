import React from 'react';
import './App.css';
import Layout from './components/Layout'
import Header from './components/Header'
import Footer from './components/Footer'

export default class APP extends React.Component {
	
	render(){
		return (
			<div className="App">
				<Header ></Header>
				<Layout ></Layout>
				<Footer></Footer>
			</div>
		)
	}
}

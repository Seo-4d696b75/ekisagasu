import {GoogleApiWrapper, Map, Marker} from "google-maps-react";
import React from "react";

export class MapContainer extends React.Component {
	render(){
		return(
			<div className='Map-container'>
				<Map
					google={this.props.google}
					zoom={14}
					center={{ lat: 35.681236, lng: 139.767125 }}
					initialCenter={{ lat: 35.681236, lng: 139.767125 }}
				>
					<Marker
						title={"現在地"}
						position={{ lat: 35.681236, lng: 139.767125 }}
					/>

				</Map>
			</div>
			
		)
	}
}

const LoadingContainer = (props) => (
	<div className='Map-container'>Map is loading...</div>
);

export default GoogleApiWrapper({
	apiKey: "AIzaSyAi5Nv266dJyucThSkO1dtMn0kJdp_16Z0",
	language: "ja",
	LoadingContainer: LoadingContainer
})(MapContainer);
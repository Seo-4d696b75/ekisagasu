import React, { useMemo } from "react";
import pin_station from "../../img/map_pin_station.svg";
import pin_station_extra from "../../img/map_pin_station_extra.svg";
import { Station } from "../../station";
import AdvancedMarker from "./AdvancedMarker";

export interface StationMarkerProps {
    station: Station
}

const StationMarker: React.FC<StationMarkerProps> = ({ station }) => {
    const icon = useMemo(() => (
        <img src={station.extra ? pin_station_extra : pin_station} alt={station.name} />
    ), [station])

    return (
        <AdvancedMarker
            position={station.position}>
            {icon}
        </AdvancedMarker>
    )
}

export default StationMarker
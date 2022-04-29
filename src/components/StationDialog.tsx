import { FC, useMemo, useState } from "react";
import img_delete from "../img/ic_delete.png";
import img_radar from "../img/radar.png";
import img_voronoi from "../img/voronoi.png";
import { Line } from "../script/Line";
import { Station } from "../script/Station";
import { StationDetails, StationRadar, StationTitle } from "./DialogSections";
import { useRefCallback } from "./Hooks";
import "./InfoDialog.css";
import { StationDialogProps } from "./MapNavState";

interface StationInfoProps {
  info: StationDialogProps
  onClosed: (() => any)
  onLineSelected: ((line: Line) => any)
  onStationSelected: ((s: Station) => any)
  onShowVoronoi?: ((s: Station) => any)
}

export const StationDialog: FC<StationInfoProps> = ({ info, onClosed, onLineSelected, onStationSelected, onShowVoronoi }) => {
  const [showRadar, setShowRadar] = useState(false)

  const station = info.props.station

  const showVoronoiCallbackRef = useRefCallback(() => {
    if (onShowVoronoi) {
      onShowVoronoi(station)
    }
  })

  const onClosedRef = useRefCallback(onClosed)

  const actionBottonSection = useMemo(() => {
    return (
      <div className="button-container">
        <img
          src={img_delete}
          alt="close dialog"
          className="icon-action close"
          onClick={() => onClosedRef()} /><br />
        <img
          onClick={() => showVoronoiCallbackRef()}
          src={img_voronoi}
          alt="show voronoi"
          className="icon-action" /><br />
        <img
          onClick={() => setShowRadar(true)}
          src={img_radar}
          alt="show radar"
          className="icon-action radar" />
      </div>
    )
  }, [])

  return (
    <div className="info-dialog">

      <div className="container-main station-title">
        <StationTitle station={station} />
        {actionBottonSection}
      </div>

      <StationDetails
        info={info}
        onLineSelected={onLineSelected} />
      <StationRadar
        info={info}
        show={showRadar}
        onStationSelected={onStationSelected}
        onClose={() => setShowRadar(false)} />
    </div>
  );
}

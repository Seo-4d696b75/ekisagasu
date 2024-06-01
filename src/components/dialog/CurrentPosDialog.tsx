import { FC, useMemo, useState } from "react";
import { CSSTransition } from "react-transition-group";
import img_above from "../../img/ic_above.png";
import img_delete from "../../img/ic_delete.png";
import img_radar from "../../img/radar.png";
import { Line } from "../../station/line";
import { Station } from "../../station/station";
import { CurrentPosDialogProps } from "../navState";
import { StationDetails, StationRadar, StationTitle } from "./DialogSections";
import "./InfoDialog.css";

interface CurrentPosInfoProps {
  info: CurrentPosDialogProps
  onLineSelected: ((line: Line) => any)
  onStationSelected: ((s: Station) => any)
}

export const CurrentPosDialog: FC<CurrentPosInfoProps> = ({ info, onLineSelected, onStationSelected }) => {
  const [showRadar, setShowRadar] = useState(false)
  const [showDetails, setShowDetails] = useState(true)

  const toggleStationDetails = (show: boolean) => {
    setShowDetails(show)
    setShowRadar(false)
  }

  const station = info.props.station

  const actionButtonSection = useMemo(() => (
    <div className="button-container">
      {showDetails ? (
        <img
          src={img_delete}
          alt="close detail"
          className="icon-action close current-pos"
          onClick={() => toggleStationDetails(false)} />
      ) : (
        <img
          src={img_above}
          alt="show detail"
          className="icon-action expand"
          onClick={() => toggleStationDetails(true)} />
      )}
      <br />
      {showDetails ? (
        <img
          onClick={() => setShowRadar(true)}
          src={img_radar}
          alt="show radar"
          className="icon-action radar" />
      ) : null}
    </div>
  ), [showDetails])

  return (
    <div className="info-dialog">
      <div className="container-main station-title">
        <StationTitle station={station} />
        {actionButtonSection}
      </div>
      <CSSTransition
        in={showDetails}
        className="container-expand station-detail"
        timeout={400}>
        <div className="container-expand station-detail">
          <StationDetails
            info={info}
            onLineSelected={onLineSelected} />
        </div>
      </CSSTransition>

      <StationRadar
        info={info}
        show={showRadar}
        onStationSelected={onStationSelected}
        onClose={() => setShowRadar(false)} />
    </div>
  )
}

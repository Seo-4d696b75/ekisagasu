import React, { FC, useMemo, useState } from "react";
import { CSSTransition } from "react-transition-group";
import img_delete from "../../img/ic_delete.png";
import img_line from "../../img/ic_line.png";
import img_station from "../../img/station.png";
import { Line } from "../../model/line";
import { Station } from "../../model/station";
import { useRefCallback } from "../hooks";
import { LineDialogProps } from "../navState";
import "./InfoDialog.css";

export interface LineInfoProps {
  info: LineDialogProps
  onClosed: (() => any)
  onStationSelected: ((s: Station) => any)
  onShowPolyline: ((line: Line) => any)
}

export const LineDialog: FC<LineInfoProps> = ({ info, onClosed, onStationSelected, onShowPolyline }) => {
  const [expand, setExpand] = useState(false)

  const toggleStationList = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpand(e.target.checked)
  }

  const line = info.props.line
  const lineDetails = info.props.line.detail

  const onClosedRef = useRefCallback(onClosed)

  const showPolylineRef = useRefCallback(() => {
    if (line.detail) {
      onShowPolyline(line)
    }
  })

  const titleSection = useMemo(() => {
    return (
      <div className="container-main line">
        <div className="horizontal-container">
          <div className="icon-line big" style={{ backgroundColor: line.color }}></div>
          <div className="title-container line">
            <p className="title-name">{line.name}</p>
            <p className="title-name kana">{line.nameKana}</p>
          </div>
        </div>

        <div className="horizontal-container">
          <img src={img_station} alt="icon-details" className="icon-station" />
          <div className="container-description">
            登録駅一覧
          </div>
        </div>

        <div className="button-container">
          <img
            src={img_delete}
            alt="close dialog"
            className="icon-action"
            onClick={() => onClosedRef()} />
          <img
            src={img_line}
            alt="show polyline"
            onClick={() => showPolylineRef()}
            className="icon-action" />
        </div>
      </div>
    )
  }, [line, onClosedRef, showPolylineRef])

  const onStationSelectedRef = useRefCallback((s: Station) => onStationSelected(s))

  const stationListSection = useMemo(() => {
    return (
      <div className="container-accordion station-list">
        {lineDetails ? (
          <div className="scroll-container stations">
            <table>
              <tbody>

                {lineDetails.stations.map((station, index) => {
                  return (
                    <tr key={index}
                      onClick={() => onStationSelectedRef(station)}
                      className="list-cell station">
                      <td className="station-cell">
                        <span className="station-item name">{station.name}</span>&nbsp;
                        <span className="station-item name-kana">{station.nameKana}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="container-description loading-mes">Now Loading...</p>
        )}

        <div className="bottom-container">
          <div className="icon-action toggle">
            <input type="checkbox" id="toggle-list" onChange={toggleStationList}></input>
            <label className="toggle-button" htmlFor="toggle-list">
            </label>

          </div>
        </div>
      </div>
    )
  }, [lineDetails, onStationSelectedRef])

  return (
    <div className="info-dialog">
      {titleSection}
      <CSSTransition
        in={expand}
        className="container-accordion station-list"
        timeout={400}>
        {stationListSection}
      </CSSTransition>
    </div>
  )
}
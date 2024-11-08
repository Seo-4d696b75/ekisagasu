import { FC, useMemo, useRef } from "react"
import { CSSTransition } from "react-transition-group"
import img_above from "../../img/ic_above.png"
import img_location from "../../img/map_pin.svg"
import img_mylocation from "../../img/pin_mylocation.png"
import img_radar from "../../img/radar.png"
import img_station from "../../img/station.png"
import { Line, Station } from "../../station"
import { useRefCallback } from "../hooks"
import { DialogType, StationDialogProps } from "../navState"
import "./InfoDialog.css"

function formatDistance(dist: number): string {
  if (dist < 1000.0) {
    return `${dist.toFixed(0)}m`
  } else {
    return `${(dist / 1000).toFixed(1)}km`
  }
}

export const StationTitle: FC<{ station: Station }> = ({ station }) => {
  return useMemo(() => {
    return (
      <div className="title-container station">
        <p className="title-name">{station.name}</p>
        <p className="title-name kana">{station.nameKana}</p>
      </div>
    )
  }, [station])
}

export interface StationDetailProps {
  info: StationDialogProps
  onLineSelected: (line: Line) => void
}

export const StationDetails: FC<StationDetailProps> = ({ info, onLineSelected }) => {
  const station = info.props.station
  const lines = info.props.lines

  const onLineSelectedRef = useRefCallback(onLineSelected)

  const table = useMemo(() => (
    <table>
      <tbody>
        {lines.map((line, index) => {
          return (
            <tr key={index}
              onClick={() => onLineSelectedRef(line)}
              className="list-cell line">
              <td className="line-item icon"><div className="icon-line" style={{ backgroundColor: line.color }} /></td>
              <td className="line-item line">{line.name}&nbsp;&nbsp;<small>{line.stationSize}駅</small></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  ), [lines, onLineSelectedRef])

  const detail = useMemo(() => {
    return (
      <>
        <div className="horizontal-container">
          <img src={img_station} alt="icon-details" className="icon-station" />
          <div>
            <div className="container-description">
              {info.props.prefecture}
            </div>
            <div className="container-description location">
              E{station.position.lng} N{station.position.lat}
            </div>
          </div>
        </div>

        {info.type === DialogType.SELECT_POSITION ? (
          <div className="horizontal-container position">
            <img src={img_location}
              alt="icon-details"
              className="icon-station" />
            <div className="container-description">
              <div className="horizontal-container">
                <div className="position-title">&nbsp;選択した地点&nbsp;</div>
                <img className="arrow-right" src={img_above} alt="arrow-right" />
                <div className="station-distance">{formatDistance(info.props.dist)}</div>
              </div>
              E{info.props.position.lng.toFixed(6)} N{info.props.position.lat.toFixed(6)}
            </div>
          </div>
        ) : null}
        {info.type === DialogType.CURRENT_POSITION ? (
          <div className="horizontal-container position">
            <img src={img_mylocation}
              alt="icon-details"
              className="icon-station" />
            <div className="container-description">
              <div className="horizontal-container">
                <div className="position-title">&nbsp;現在位置 &nbsp;</div>
                <img className="arrow-right" src={img_above} alt="arrow-right" />
                <div className="station-distance">{formatDistance(info.props.dist)}</div>
              </div>
              E{info.props.position.lng.toFixed(6)} N{info.props.position.lat.toFixed(6)}
            </div>
          </div>
        ) : null}
      </>
    )
  }, [info, station])

  return (
    <div className={`container-main station-detail ${info.type === DialogType.SELECT_POSITION ? 'position' : ''}`}>
      {detail}
      <div className={`scroll-container lines ${info.type === DialogType.STATION ? null : "position"}`}>
        {table}
      </div>
    </div>
  )
}

export interface StationRadarProps {
  info: StationDialogProps
  show: boolean
  onStationSelected: (s: Station) => void
  onClose: () => void
}

export const StationRadar: FC<StationRadarProps> = ({ info, show, onStationSelected, onClose }) => {
  const radarList = info.props.radarList

  const onStationSelectedRef = useRefCallback(onStationSelected)
  const onCloseRef = useRefCallback(onClose)

  const transitionNodeRef = useRef<HTMLDivElement>(null)
  const content = useMemo(() => {
    return (
      <div ref={transitionNodeRef} className="container-expand radar">
        <div className="horizontal-container radar-title">
          <img src={img_radar} alt="icon-radar" className="icon-radar" />
          <div className="radar-k">x{radarList.length}</div>
        </div>
        <div className="scroll-container radar">
          <table>
            <tbody>
              {radarList.map((e, index) => {
                var dist = formatDistance(e.dist)
                return (
                  <tr key={index} className="list-cell station"
                    onClick={() => onStationSelectedRef(e.station)}>
                    <td className="radar-item index">{index + 1}</td>
                    <td className="radar-item dist">{dist}</td>
                    <td className="radar-item station">{e.station.name}&nbsp;&nbsp;{e.lines}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="bottom-container radar">
          <img
            src={img_above}
            alt="close radar"
            className="icon-action"
            onClick={() => onCloseRef()} />
        </div>
      </div>
    )
  }, [radarList, onStationSelectedRef, onCloseRef])

  return (
    <div className={`container-main radar ${info.type === DialogType.STATION ? "" : "position"}`}>
      <CSSTransition
        nodeRef={transitionNodeRef}
        in={show}
        className="container-expand radar"
        timeout={400}>
        {content}
      </CSSTransition>
    </div>
  )
}

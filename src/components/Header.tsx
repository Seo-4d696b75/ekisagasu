import React, { FC, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import { CSSTransition } from "react-transition-group";
import img_delete from "../img/ic_delete.png";
import img_help from "../img/ic_help.png";
import img_search from "../img/ic_search.png";
import img_setting from "../img/ic_settings.png";
import * as Action from "../script/Actions";
import { createEvent, createIdleEvent } from "../script/Event";
import { GlobalState } from "../script/Reducer";
import "./Header.css";
import StationSearchBox, { StationSuggestion } from "./StationSearchBox";

interface HeaderProps {
  radarK: number
  showPosition: boolean
  showStationPin: boolean
  highAccuracy: boolean

}

function mapGlobalState2Props(state: GlobalState): HeaderProps {
  return {
    radarK: state.radar_k,
    showPosition: state.watch_position,
    showStationPin: state.show_station_pin,
    highAccuracy: state.high_accuracy,

  }
}

const Header: FC<HeaderProps> = ({ radarK, showPosition, showStationPin, highAccuracy }) => {
  const [showSetting, setShowSetting] = useState(false)
  const [showSearchBox, setShowSearchBox] = useState(false)
  const [inputFocusRequest, setInputFocusRequest] = useState(createIdleEvent<void>())

  const onRadarKChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("radar-k chnaged", e.target.value)
    var k = parseInt(e.target.value)
    Action.setRadarK(k)
  }

  const showStationItem = (item: StationSuggestion) => {
    Action.requestShowStationItem(item)
    setShowSearchBox(false)
  }

  const radar_min = process.env.REACT_APP_RADAR_MIN
  const radar_max = process.env.REACT_APP_RADAR_MAX

  const searchBoxSection = useMemo(() => {
    //console.log("render: search box")
    return (
      <CSSTransition
        in={showSearchBox}
        className="search-box"
        timeout={300}
        onEntered={() => setInputFocusRequest(createEvent<void>(undefined))}>
        <div className="search-box">
          <StationSearchBox
            inputFocusRequested={inputFocusRequest}
            onSuggestionSelected={showStationItem}> </StationSearchBox>
        </div>
      </CSSTransition>
    )
  }, [showSearchBox, inputFocusRequest])

  const actionButtonSection = useMemo(() => (
    <div className="Action-container">
      <img className="Action-button search"
        src={img_search}
        alt="search"
        style={{ display: showSearchBox ? 'none' : 'inline-block' }}
        onClick={() => setShowSearchBox(true)}></img>
      <Link to="/help" target="_blank">
        <img className="Action-button help"
          src={img_help}
          alt="help"></img>
      </Link>

      <img className="Action-button setting"
        src={img_setting}
        alt="setting"
        onClick={() => setShowSetting(true)}></img>
    </div>
  ), [showSearchBox])

  const settingRadarSection = useMemo(() => (
    <>
      <div className="Setting-title radar"> レーダ検知数 &nbsp;<strong>{radarK}</strong></div>
      <div className="Setting-slider radar">
        <span>{radar_min}</span>
        <input
          type="range"
          min={radar_min}
          max={radar_max}
          value={radarK}
          step="1"
          name="radar"
          onChange={onRadarKChanged}
          list="radar-list">
        </input><span>{radar_max}</span>
        <datalist id="radar-list">
          <option value={radar_min} label={radar_min.toString()}></option>
          {[...Array(radar_max).keys()].slice(radar_min + 1).map(v => (
            <option value={v}></option>
          ))}
          <option value={radar_max} label={radar_max.toString()}></option>
        </datalist>
      </div>
    </>
  ), [radarK])

  const settingPositionSection = useMemo(() => (
    <div className="switch-container">
      <div className="Setting-title position"> 現在位置の表示 </div>
      <div className="toggle-switch position">
        <input id="toggle-position"
          className="toggle-input"
          type='checkbox'
          checked={showPosition}
          onChange={(e) => Action.setWatchCurrentPosition(e.target.checked)} />
        <label htmlFor="toggle-position" className="toggle-label" />
      </div>
    </div>
  ), [showPosition])

  const settingAccuracySection = useMemo(() => (
    <div className="switch-container">
      <div className="Setting-title accuracy"> 高精度な位置情報 </div>
      <div className="toggle-switch accuracy">
        <input id="toggle-accuracy"
          className="toggle-input"
          type='checkbox'
          checked={highAccuracy}
          onChange={(e) => Action.setPositionAccuracy(e.target.checked)} />
        <label htmlFor="toggle-accuracy" className="toggle-label" />
      </div>
    </div>
  ), [highAccuracy])

  const settingStationPinSection = useMemo(() => (
    <div className="switch-container">
      <div className="Setting-title pin"> 地図上で駅の座標にピンを表示 </div>
      <div className="toggle-switch pin">
        <input id="toggle-pin"
          className="toggle-input"
          type='checkbox'
          checked={showStationPin}
          onChange={(e) => Action.setShowStationPin(e.target.checked)} />
        <label htmlFor="toggle-pin" className="toggle-label" />
      </div>
    </div>
  ), [showStationPin])

  const settingSection = useMemo(() => {
    //console.log("render: setting dialog")
    return (
      <CSSTransition
        in={showSetting}
        className="Setting-container"
        timeout={400}>

        <div className="Setting-container">
          <div className="Setting-frame">

            <img
              src={img_delete}
              alt="close dialog"
              className="Action-button close"
              onClick={() => setShowSetting(false)} />
            {settingRadarSection}
            {settingPositionSection}
            {settingAccuracySection}
            {settingStationPinSection}
          </div>
        </div>

      </CSSTransition>
    )
  }, [showSetting, radarK, showPosition, highAccuracy, showStationPin])

  return (
    <div className='Map-header'>
      <div className="Header-frame">
        <div className="App-title"> 駅サガース </div>
        {searchBoxSection}
        {actionButtonSection}
      </div>
      {settingSection}
    </div>
  )
}

export default connect(mapGlobalState2Props)(Header)
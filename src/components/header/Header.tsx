import React, { FC, useCallback, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { CSSTransition } from "react-transition-group";
import img_delete from "../../img/ic_delete.png";
import img_help from "../../img/ic_help.png";
import img_search from "../../img/ic_search.png";
import img_setting from "../../img/ic_settings.png";
import { logger } from "../../logger";
import * as action from "../../redux/actions";
import { selectMapState, selectStationState } from "../../redux/selector";
import { AppDispatch } from "../../redux/store";
import repository from "../../station/repository";
import { createEvent, createIdleEvent } from "../event";
import "./Header.css";
import StationSearchBox, { StationSuggestion } from "./StationSearchBox";

const radarMin = import.meta.env.VITE_RADAR_MIN
const radarMax = import.meta.env.VITE_RADAR_MAX

const Header: FC = () => {
  const {
    radarK,
    currentLocation,
    showStationPin,
    isHighAccuracyLocation,
  } = useSelector(selectMapState)

  const {
    dataType,
  } = useSelector(selectStationState)

  const dispatch = useDispatch<AppDispatch>()

  const [showSetting, setShowSetting] = useState(false)
  const [showSearchBox, setShowSearchBox] = useState(false)
  const [inputFocusRequest, setInputFocusRequest] = useState(createIdleEvent<void>())

  const onRadarKChanged = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    logger.d("radar-k changed", e.target.value)
    var k = parseInt(e.target.value)
    dispatch(action.setRadarK(k))
  }, [dispatch]) // dispatch reference is stable, but redux doesn't know it

  const showStationItem = useCallback((item: StationSuggestion) => {
    switch (item.type) {
      case 'station': {
        dispatch(action.requestShowStation(item.code))
        break
      }
      case 'line': {
        const line = repository.getLine(item.code)
        dispatch(action.requestShowLine(line))
        break
      }
    }
    setShowSearchBox(false)
  }, [dispatch])

  const searchBoxTransitionRef = useRef<HTMLDivElement>(null)
  const searchBoxSection = useMemo(() => {
    return (
      <CSSTransition
        nodeRef={searchBoxTransitionRef}
        in={showSearchBox}
        className="search-box"
        timeout={300}
        onEntered={() => setInputFocusRequest(createEvent<void>(undefined))}>
        <div ref={searchBoxTransitionRef} className="search-box">
          <StationSearchBox
            inputFocusRequested={inputFocusRequest}
            onSuggestionSelected={showStationItem} />
        </div>
      </CSSTransition>
    )
  }, [showSearchBox, inputFocusRequest, showStationItem])

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
        <span>{radarMin}</span>
        <input
          type="range"
          min={radarMin}
          max={radarMax}
          value={radarK}
          step="1"
          name="radar"
          onChange={onRadarKChanged}
          list="radar-list">
        </input><span>{radarMax}</span>
        <datalist id="radar-list">
          <option value={radarMin} label={radarMin.toString()}></option>
          {[...Array(radarMax).keys()].slice(radarMin + 1).map(v => (
            <option value={v}></option>
          ))}
          <option value={radarMax} label={radarMax.toString()}></option>
        </datalist>
      </div>
    </>
  ), [radarK, onRadarKChanged])

  const settingPositionSection = useMemo(() => (
    <div className="switch-container">
      <div className="Setting-title position"> 現在位置の表示 </div>
      <div className="toggle-switch position">
        <input id="toggle-position"
          className="toggle-input"
          type='checkbox'
          checked={currentLocation.type === 'watch'}
          onChange={(e) => dispatch(action.setWatchCurrentLocation(e.target.checked))} />
        <label htmlFor="toggle-position" className="toggle-label" />
      </div>
    </div>
  ), [currentLocation.type, dispatch])

  const settingAccuracySection = useMemo(() => (
    <div className="switch-container">
      <div className="Setting-title accuracy"> 高精度な位置情報 </div>
      <div className="toggle-switch accuracy">
        <input id="toggle-accuracy"
          className="toggle-input"
          type='checkbox'
          checked={isHighAccuracyLocation}
          onChange={(e) => dispatch(action.setHighAccuracyLocation(e.target.checked))} />
        <label htmlFor="toggle-accuracy" className="toggle-label" />
      </div>
    </div>
  ), [isHighAccuracyLocation, dispatch])

  const settingStationPinSection = useMemo(() => (
    <div className="switch-container">
      <div className="Setting-title pin"> 地図上で駅の座標にピンを表示 </div>
      <div className="toggle-switch pin">
        <input id="toggle-pin"
          className="toggle-input"
          type='checkbox'
          checked={showStationPin}
          onChange={(e) => dispatch(action.setShowStationPin(e.target.checked))} />
        <label htmlFor="toggle-pin" className="toggle-label" />
      </div>
    </div>
  ), [showStationPin, dispatch])

  const settingExtraSection = useMemo(() => (
    <div className="switch-container">
      <div>
        <div className="Setting-title new">NEW</div>
        <div className="Setting-title extra"> extraデータを表示 </div>
      </div>
      <div className="toggle-switch pin">
        <input id="toggle-extra"
          className="toggle-input"
          type='checkbox'
          checked={dataType === 'extra'}
          onChange={(e) => dispatch(action.setDataType(e.target.checked ? 'extra' : 'main'))} />
        <label htmlFor="toggle-extra" className="toggle-label" />
      </div>
    </div>
  ), [dataType, dispatch])

  const settingTransitionRef = useRef<HTMLDivElement>(null)

  return (
    <div className='Map-header'>
      <div className="Header-frame">
        <div className="App-title"> 駅サガース </div>
        {searchBoxSection}
        {actionButtonSection}
      </div>
      <div className="setting container">
        <CSSTransition
          nodeRef={settingTransitionRef}
          in={showSetting}
          className="setting modal"
          timeout={400}>
          <div ref={settingTransitionRef} className="setting modal">
            <img
              src={img_delete}
              alt="close dialog"
              className="Action-button close"
              onClick={() => setShowSetting(false)} />
            {settingRadarSection}
            {settingPositionSection}
            {settingAccuracySection}
            {settingStationPinSection}
            {settingExtraSection}
          </div>
        </CSSTransition>
      </div>
    </div>
  )
}

export default Header
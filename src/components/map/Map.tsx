import { Circle, GoogleMap, Libraries, Polygon, Polyline, useJsApiLoader } from "@react-google-maps/api"
import { FC, useEffect, useMemo, useRef, useState } from "react"
import { useSelector } from "react-redux"
import { CSSTransition } from "react-transition-group"
import pin_heading from "../../img/heading_pin.svg"
import pin_location from "../../img/map_pin.svg"
import pin_position from "../../img/position_pin.svg"
import locationRepository from "../../location/repository"
import { logger } from "../../logger"
import { selectMapState, selectStationState } from "../../redux/selector"
import stationRepository from "../../station/repository"
import { CurrentPosDialog } from "../dialog/CurrentPosDialog"
import { LineDialog } from "../dialog/LineDialog"
import { StationDialog } from "../dialog/StationDialog"
import { DialogType, NavType, isInfoDialog, isStationDialog } from "../navState"
import AdvancedMarker from "./AdvancedMarker"
import "./Map.css"
import { useMapCallback } from "./mapEventHook"
import { useMapCenterChangeEffect, useMapOperator } from "./mapHook"
import { useStationMarkers } from "./markerHook"
import { CurrentPosIcon } from "./PositionIcon"
import { useProgressBanner } from "./progressHook"
import { useQueryEffect } from "./queryHook"
import StationMarker from "./StationMarker"

const VORONOI_COLOR = [
  "#0000FF",
  "#00AA00",
  "#FF0000",
  "#CCCC00"
]

const apiLoaderOptions = {
  id: 'google-map-script',
  googleMapsApiKey: process.env.VITE_API_KEY,
  language: 'ja',
  libraries: ['marker'] as Libraries,
}

const MapContainer: FC = () => {

  /* ===============================
   get state variables and callbacks
  ================================ */

  const {
    radarK,
    nav,
    currentLocation,
    mapCenter,
    isUserDragging,
  } = useSelector(selectMapState)

  const {
    dataType,
    stations,
  } = useSelector(selectStationState)

  const [screenWide, setScreenWide] = useState(false)

  const googleMapRef = useRef<google.maps.Map | null>(null)
  const mapElementRef = useRef<HTMLDivElement>(null)


  // banner shown while async task taking a long time
  const {
    banner,
    showProgressBannerWhile,
  } = useProgressBanner()

  // functions operating the map and its state variables
  const {
    showStation,
    showLine,
    showRadarVoronoi,
    showPolyline,
    updateBounds,
    closeDialog,
    focusAt,
    focusAtNearestStation,
    requestCurrentPosition,
    switchDataType,
  } = useMapOperator(showProgressBannerWhile, googleMapRef, mapElementRef)

  // callbacks listening to map events
  const {
    onMouseDown,
    onMapClicked,
    onMapRightClicked,
    onMapDragStart,
    onMapIdle,
    onMapReady,
  } = useMapCallback(screenWide, googleMapRef, {
    focusAt,
    focusAtNearestStation,
    closeDialog,
    updateBounds,
    showPolyline,
    showRadarVoronoi,
    requestCurrentPosition,
    progressHandler: showProgressBannerWhile,
  })

  useEffect(() => {
    // componentDidMount
    logger.d("componentDidMount")

    const onScreenResized = () => {
      let wide = window.innerWidth >= 900
      setScreenWide(wide)
    }
    window.addEventListener("resize", onScreenResized)
    onScreenResized()
    return () => {
      // componentWillUnmount
      logger.d("componentWillUnmount")
      locationRepository.release()
      stationRepository.release()
      window.removeEventListener("resize", onScreenResized)
      googleMapRef.current = null
    }
  }, [])

  // 現在位置・拡大率が変更されたらMap中心位置を変更する
  useMapCenterChangeEffect(mapCenter, googleMapRef, isUserDragging)

  const isWatchCurrentPosition = currentLocation.type === 'watch'
  const currentPosition = isWatchCurrentPosition ? currentLocation.location?.position : undefined

  // データ種類が変わったら更新
  useEffect(() => {
    if (dataType) {
      switchDataType(dataType)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataType])

  // App状態に応じてURLのクエリを動的に更新
  useQueryEffect(nav, dataType, isWatchCurrentPosition, mapCenter)

  /* ===============================
   render section below
  ================================ */

  const stationMarkers = useStationMarkers()

  const currentPositionMarker = useMemo(() => {
    if (isWatchCurrentPosition && currentPosition) {
      return (
        <AdvancedMarker
          position={currentPosition}
          anchorX={0.5}
          anchorY={0.5}>
          <img src={pin_position} alt='現在位置' />
        </AdvancedMarker>
      )
    } else {
      return null
    }
  }, [isWatchCurrentPosition, currentPosition])

  const currentHeading = isWatchCurrentPosition ? currentLocation.location?.heading : undefined
  const currentHeadingMarker = useMemo(() => {
    if (isWatchCurrentPosition && currentPosition && currentHeading && !isNaN(currentHeading)) {
      return (
        <AdvancedMarker
          position={currentPosition}
          anchorX={0.5}
          anchorY={0.5}>
          <img
            src={pin_heading}
            alt='現在位置'
            style={{ transform: `rotate(${currentHeading}deg)` }} />
        </AdvancedMarker>
      )
    } else {
      return null
    }
  }, [isWatchCurrentPosition, currentPosition, currentHeading])

  const currentAccuracy = isWatchCurrentPosition ? currentLocation.location?.accuracy : undefined
  const currentAccuracyCircle = useMemo(() => {
    if (isWatchCurrentPosition && currentPosition && currentAccuracy) {
      return (
        <Circle
          visible={currentAccuracy > 10}
          center={currentPosition}
          radius={currentAccuracy}
          options={{
            strokeColor: '#0088ff',
            strokeOpacity: 0.8,
            strokeWeight: 1,
            fillColor: '#0088ff',
            fillOpacity: 0.2,
            clickable: false,
          }} />
      )
    } else {
      return null
    }
  }, [isWatchCurrentPosition, currentPosition, currentAccuracy])

  const selectedPos = nav.type === NavType.DIALOG_SELECT_POS ? nav.data.dialog.props.position : undefined
  const selectedPosMarker = useMemo(() => selectedPos ? (
    <AdvancedMarker
      position={selectedPos}>
      <img src={pin_location} alt='選択地点' />
    </AdvancedMarker>
  ) : null, [selectedPos])

  const selectedStation = isStationDialog(nav) ? nav.data.dialog.props.station : undefined
  const selectedStationMarker = useMemo(() => selectedStation ? (
    <StationMarker station={selectedStation} />
  ) : null, [selectedStation])

  const lineData = nav.type === NavType.DIALOG_LINE && nav.data.showPolyline ? nav.data : null
  const lineMarkers = useMemo(() => {
    if (lineData) {
      return lineData.stationMakers.map((s, i) => (
        <StationMarker
          key={i}
          station={s} />
      ))
    } else {
      return null
    }
  }, [lineData])
  const linePolylines = useMemo(() => {
    if (lineData) {
      return lineData.polylineList.map((p, i) => (
        <Polyline
          key={i}
          path={p.points}
          options={{
            strokeColor: '#FF0000',
            strokeWeight: 2,
            strokeOpacity: 0.8,
            clickable: false,
          }} />
      ))
    } else {
      return null
    }
  }, [lineData])


  const showVoronoi = !(isStationDialog(nav) && nav.data.highVoronoi)
  const voronoiPolygons = useMemo(() => {
    if (!showVoronoi) return null

    // 現在のzoomで大きさ 50 pixel^2 以上の図形のみ描画する
    return stations
      .filter(s => s.voronoiArea * Math.pow(2, mapCenter.zoom * 2) > 50)
      .map(s => (
        <Polygon
          key={s.code}
          paths={s.voronoiPolygon}
          options={{
            strokeColor: '#0000FF',
            strokeWeight: 1,
            strokeOpacity: 0.8,
            fillOpacity: 0,
            clickable: false,
          }} />
      ))
  }, [showVoronoi, stations, mapCenter.zoom])

  const highVoronoi = isStationDialog(nav) ? nav.data.highVoronoi : null
  const highVoronoiPolygons = useMemo(() => {
    if (highVoronoi) {
      return highVoronoi.map((points, i) => (
        <Polygon
          key={i}
          paths={points}
          options={{
            strokeColor: (i === radarK - 1) ? "#000000" : VORONOI_COLOR[i % VORONOI_COLOR.length],
            strokeWeight: 1,
            strokeOpacity: 0.8,
            fillOpacity: 0,
            clickable: false,
          }} />
      ))
    } else {
      return null
    }
  }, [highVoronoi, radarK])


  // ダイアログを閉じる時アニメーションが終了するまえに nav.data.dialog が undefined になる
  // 動作が重くなる副作用もあるため閉じるアニメーションは無し
  const infoDialogRef = useRef<HTMLDivElement>(null)
  const InfoDialog = (
    <div className="info-modal container">
      <CSSTransition
        nodeRef={infoDialogRef}
        in={isInfoDialog(nav)}
        className="info-modal holder"
        timeout={300}>
        <div ref={infoDialogRef} className="info-modal holder">
          {
            !isInfoDialog(nav)
              ? null
              : nav.data.dialog.type === DialogType.LINE
                ? <LineDialog
                  info={nav.data.dialog}
                  onStationSelected={showStation}
                  onClosed={closeDialog}
                  onShowPolyline={showPolyline} />
                : <StationDialog
                  info={nav.data.dialog}
                  onStationSelected={showStation}
                  onLineSelected={showLine}
                  onClosed={closeDialog}
                  onShowVoronoi={showRadarVoronoi} />
          }
        </div>
      </CSSTransition>
    </div>
  )

  const currentPosDialogRef = useRef<HTMLDivElement>(null)
  const currentPosDialog = (
    <div className="info-modal container current-position">
      <CSSTransition
        nodeRef={currentPosDialogRef}
        in={nav.type === NavType.IDLE && !!nav.data.dialog}
        className="info-modal holder current-position"
        timeout={300}>
        <div ref={currentPosDialogRef} className="info-modal holder current-position">
          {
            nav.type === NavType.IDLE && nav.data.dialog
              ? <CurrentPosDialog
                info={nav.data.dialog}
                onStationSelected={showStation}
                onLineSelected={showLine} />
              : null
          }
        </div>
      </CSSTransition>
    </div>
  )

  const { isLoaded: isMapLoaded } = useJsApiLoader(apiLoaderOptions)

  return isMapLoaded ? (
    <div className='Map-container' ref={mapElementRef}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        zoom={14}
        options={{
          mapId: 'd31074a05ea0181c',
          mapTypeControlOptions: {
            position: google.maps.ControlPosition.TOP_RIGHT,
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          },
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
        }}
        onLoad={onMapReady}
        onClick={onMapClicked}
        onRightClick={onMapRightClicked}
        onDragStart={onMapDragStart}
        onIdle={onMapIdle}
        onMouseDown={onMouseDown}
      >
        {stationMarkers}
        {currentPositionMarker}
        {currentHeadingMarker}
        {currentAccuracyCircle}
        {selectedStationMarker}
        {selectedPosMarker}
        {lineMarkers}
        {linePolylines}
        {voronoiPolygons}
        {highVoronoiPolygons}

      </GoogleMap>

      {InfoDialog}
      {currentPosDialog}
      {banner}
      <CurrentPosIcon onClick={requestCurrentPosition} />
    </div>
  ) : (
    <div className='Map-container'>Map is loading...</div>
  )
}

export default MapContainer

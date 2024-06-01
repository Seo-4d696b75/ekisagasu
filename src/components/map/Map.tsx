import { Circle, GoogleMap, Marker, Polygon, Polyline, useJsApiLoader } from "@react-google-maps/api"
import { FC, useEffect, useMemo, useRef, useState } from "react"
import { useSelector } from "react-redux"
import { CSSTransition } from "react-transition-group"
import stationRepository from "../../data/StationRepository"
import pin_location from "../../img/map_pin.svg"
import pin_station from "../../img/map_pin_station.svg"
import pin_station_extra from "../../img/map_pin_station_extra.svg"
import locationRepository from "../../location/LocationRepository"
import { logger } from "../../logger"
import { selectMapState, selectStationState } from "../../redux/selector"
import { CurrentPosDialog } from "../dialog/CurrentPosDialog"
import { LineDialog } from "../dialog/LineDialog"
import { StationDialog } from "../dialog/StationDialog"
import { DialogType, NavType, isInfoDialog, isStationDialog } from "../navState"
import "./Map.css"
import { CurrentPosIcon } from "./PositionIcon"
import { useMapCallback } from "./mapEventHook"
import { useMapCenterChangeEffect, useMapOperator } from "./mapHook"
import { useProgressBanner } from "./progressHook"
import { useQueryEffect } from "./queryHook"
import { useServiceCallback } from "./serviceHook"

const VORONOI_COLOR = [
  "#0000FF",
  "#00AA00",
  "#FF0000",
  "#CCCC00"
]

const MapContainer: FC = () => {

  /* ===============================
   get state variables and callbacks
  ================================ */

  const {
    radarK,
    showStationPin,
    nav,
    currentLocation,
    mapCenter,
  } = useSelector(selectMapState)

  const {
    dataType,
    stations: voronoi,
  } = useSelector(selectStationState)

  const [screenWide, setScreenWide] = useState(false)

  const googleMapRef = useRef<google.maps.Map | null>(null)
  const mapElementRef = useRef<HTMLDivElement>(null)


  // banner shown while async task taking a long time
  const {
    banner,
    showProgressBannerWhile,
  } = useProgressBanner()

  // callbacks registered to StationService
  const {
    onLocationChanged,
    onStationLoaded,
  } = useServiceCallback()

  // functions operating the map and its state variables
  const {
    highVoronoi,
    hideStationOnMap,
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
    isDragRunning,
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
    // register callbacks
    locationRepository.onLocationChangedCallback = onLocationChanged
    stationRepository.onStationLoadedCallback = onStationLoaded
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
  }, [onLocationChanged, onStationLoaded])

  // 現在位置・拡大率が変更されたらMap中心位置を変更する
  useMapCenterChangeEffect(mapCenter, googleMapRef, isDragRunning)

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

  const currentPositionMarker = useMemo(() => {
    if (isWatchCurrentPosition && currentPosition) {
      return (
        <Marker
          position={currentPosition}
          clickable={false}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: "#154bb6",
            fillOpacity: 1.0,
            strokeColor: "white",
            strokeWeight: 1.2,
            scale: 8,
          }}></Marker>
      )
    } else {
      return null
    }
  }, [isWatchCurrentPosition, currentPosition])

  const currentHeading = isWatchCurrentPosition ? currentLocation.location?.heading : undefined
  const currentHeadingMarker = useMemo(() => {
    if (isWatchCurrentPosition && currentPosition && currentHeading && !isNaN(currentHeading)) {
      return (
        <Marker
          position={currentPosition}
          clickable={false}
          icon={{
            //url: require("../img/direction_pin.svg"),
            anchor: new google.maps.Point(64, 64),
            path: "M 44 36 A 40 40 0 0 1 84 36 L 64 6 Z",
            fillColor: "#154bb6",
            fillOpacity: 1.0,
            strokeColor: "white",
            strokeWeight: 1.2,
            scale: 0.3,
            rotation: currentHeading,
          }} />
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
    <Marker
      position={selectedPos}
      icon={pin_location} >
    </Marker>
  ) : null, [selectedPos])

  const selectedStation = isStationDialog(nav) ? nav.data.dialog.props.station : undefined
  const selectedStationMarker = useMemo(() => selectedStation ? (
    <Marker
      position={selectedStation.position}
      icon={selectedStation.extra ? pin_station_extra : pin_station} >
    </Marker>
  ) : null, [selectedStation])

  const lineData = nav.type === NavType.DIALOG_LINE && nav.data.showPolyline ? nav.data : null
  const lineMarkers = useMemo(() => {
    if (lineData) {
      return lineData.stationMakers.map((s, i) => (
        <Marker
          key={i}
          position={s.position}
          icon={s.extra ? pin_station_extra : pin_station}>
        </Marker>
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


  const showVoronoi = !hideStationOnMap && !(isStationDialog(nav) && nav.data.showHighVoronoi)
  const voronoiPolygons = useMemo(() => {
    if (showVoronoi) {
      return voronoi.map((s, i) => (
        <Polygon
          key={i}
          paths={s.voronoiPolygon}
          options={{
            strokeColor: '#0000FF',
            strokeWeight: 1,
            strokeOpacity: 0.8,
            fillOpacity: 0,
            clickable: false,
          }} />
      ))
    } else {
      return null
    }
  }, [showVoronoi, voronoi])

  const showStationMarker = !hideStationOnMap && showStationPin && nav.type === NavType.IDLE && showVoronoi
  const stationMarkers = useMemo(() => {
    if (showStationMarker) {
      return voronoi.map((s, i) => (
        <Marker
          key={i}
          position={s.position}
          icon={s.extra ? pin_station_extra : pin_station}>
        </Marker>
      ))
    } else {
      return null
    }
  }, [showStationMarker, voronoi])

  const showHighVoronoi = isStationDialog(nav) && nav.data.showHighVoronoi
  const highVoronoiPolygons = useMemo(() => {
    if (showHighVoronoi) {
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
  }, [showHighVoronoi, highVoronoi, radarK])


  // ダイアログを閉じる時アニメーションが終了するまえに nav.data.dialog が undefined になる
  // 動作が重くなる副作用もあるため閉じるアニメーションは無し
  const InfoDialog = (
    <div className="info-modal container">
      <CSSTransition
        in={isInfoDialog(nav)}
        className="info-modal holder"
        timeout={300}>
        <div className="info-modal holder">
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

  const currentPosDialog = (
    <div className="info-modal container current-position">
      <CSSTransition
        in={nav.type === NavType.IDLE && !!nav.data.dialog}
        className="info-modal holder current-position"
        timeout={300}>
        <div className="info-modal holder current-position">
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

  const { isLoaded: isMapLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_API_KEY,
    language: 'ja',
  })

  return isMapLoaded ? (
    <div className='Map-container' ref={mapElementRef}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        zoom={14}
        options={{
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
        {currentPositionMarker}
        {currentHeadingMarker}
        {currentAccuracyCircle}
        {selectedStationMarker}
        {selectedPosMarker}
        {lineMarkers}
        {linePolylines}
        {voronoiPolygons}
        {stationMarkers}
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

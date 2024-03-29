import { Circle, GoogleAPI, GoogleApiWrapper, Map, Marker, Polygon, Polyline } from "google-maps-react"
import { FC, useEffect, useMemo, useRef, useState } from "react"
import { useSelector } from "react-redux"
import { CSSTransition } from "react-transition-group"
import pin_location from "../../img/map_pin.svg"
import pin_station from "../../img/map_pin_station.svg"
import pin_station_extra from "../../img/map_pin_station_extra.svg"
import StationService from "../../script/StationService"
import { logger } from "../../script/logger"
import { RootState } from "../../script/mapState"
import { CurrentPosDialog } from "../dialog/CurrentPosDialog"
import { LineDialog } from "../dialog/LineDialog"
import { StationDialog } from "../dialog/StationDialog"
import { useEventEffect } from "../hooks"
import { DialogType, NavType, isInfoDialog, isStationDialog } from "../navState"
import "./Map.css"
import { CurrentPosIcon } from "./PositionIcon"
import { useMapCallback } from "./mapEventHook"
import { useMapOperator } from "./mapHook"
import { useProgressBanner } from "./progressHook"
import { useQueryEffect } from "./queryHook"
import { useServiceCallback } from "./serviceHook"

const VORONOI_COLOR = [
  "#0000FF",
  "#00AA00",
  "#FF0000",
  "#CCCC00"
]
interface MapProps {
  google: GoogleAPI
}

const MapContainer: FC<MapProps> = ({ google: googleAPI }) => {

  /* ===============================
   get state variables and callbacks
  ================================ */

  const {
    radarK,
    watchCurrentLocation: showCurrentPosition,
    showStationPin,
    nav,
    mapFocusRequest: focus,
    currentLocation,
    stations: voronoi,
    dataType,
    mapCenter,
  } = useSelector((state: RootState) => state.mapState)

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
    onGeolocationPositionChanged,
    onStationLoaded,
    dataLoadingCallback,
  } = useServiceCallback(showProgressBannerWhile)

  // functions operating the map and its state variables
  const {
    highVoronoi,
    hideStationOnMap,
    showStation,
    showLine,
    moveToPosition,
    setCenterCurrentPosition,
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
    onMapClicked,
    onMapRightClicked,
    onMapDragStart,
    onMapIdle,
    onMapReady,
  } = useMapCallback(screenWide, googleMapRef, {
    moveToPosition,
    focusAt,
    focusAtNearestStation,
    closeDialog,
    updateBounds,
    showPolyline,
    showRadarVoronoi,
    setCenterCurrentPosition,
  })

  useEffect(() => {
    // componentDidMount
    logger.d("componentDidMount")
    // register callbacks
    StationService.onGeolocationPositionChangedCallback = onGeolocationPositionChanged
    StationService.onStationLoadedCallback = onStationLoaded
    StationService.dataLoadingCallback = dataLoadingCallback
    const onScreenResized = () => {
      let wide = window.innerWidth >= 900
      setScreenWide(wide)
    }
    window.addEventListener("resize", onScreenResized)
    onScreenResized()
    return () => {
      // componentWillUnmount
      logger.d("componentWillUnmount")
      StationService.release()
      window.removeEventListener("resize", onScreenResized)
      googleMapRef.current = null
    }
  }, [onGeolocationPositionChanged, onStationLoaded, dataLoadingCallback])

  useEventEffect(focus, target => {
    moveToPosition(target.pos, target.zoom)
  })

  // 現在位置が変更されたらMap中心位置を変更する
  const currentPos = currentLocation?.position
  useEffect(() => {
    if (currentPos && showCurrentPosition && nav.type === NavType.IDLE) {
      moveToPosition(currentPos)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPos?.lat, currentPos?.lng, showCurrentPosition, nav.type])

  // データ種類が変わったら更新
  useEffect(() => {
    if (dataType && StationService.dataAPI?.type !== dataType) {
      switchDataType(dataType)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataType])

  // App状態に応じてURLのクエリを動的に更新
  useQueryEffect(nav, dataType, showCurrentPosition, mapCenter)

  /* ===============================
   render section below
  ================================ */

  const currentPosition = currentLocation?.position
  const currentPositionMarker = useMemo(() => {
    if (showCurrentPosition && currentPosition) {
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
  }, [showCurrentPosition, currentPosition])

  const currentHeading = currentLocation?.heading
  const currentHeadingMarker = useMemo(() => {
    if (showCurrentPosition && currentPosition && currentHeading && !isNaN(currentHeading)) {
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
          }}></Marker>
      )
    } else {
      return null
    }
  }, [showCurrentPosition, currentPosition, currentHeading])

  const currentAccuracy = currentLocation?.accuracy
  const currentAccuracyCircle = useMemo(() => {
    if (showCurrentPosition && currentPosition && currentAccuracy) {
      return (
        <Circle
          visible={currentAccuracy > 10}
          center={currentPosition}
          radius={currentAccuracy}
          strokeColor="#0088ff"
          strokeOpacity={0.8}
          strokeWeight={1}
          fillColor="#0088ff"
          fillOpacity={0.2}
          clickable={false}></Circle>
      )
    } else {
      return null
    }
  }, [showCurrentPosition, currentPosition, currentAccuracy])

  const selectedPos = nav.type === NavType.DIALOG_SELECT_POS ? nav.data.dialog.props.position : undefined
  const selectedPosMarker = useMemo(() => (
    <Marker
      visible={selectedPos !== undefined}
      position={selectedPos}
      icon={pin_location} >
    </Marker>
  ), [selectedPos])

  const selectedStation = isStationDialog(nav) ? nav.data.dialog.props.station : undefined
  const selectedStationMarker = useMemo(() => (
    <Marker
      visible={selectedStation !== undefined}
      position={selectedStation?.position}
      icon={selectedStation?.extra ? pin_station_extra : pin_station} >
    </Marker>
  ), [selectedStation])

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
          strokeColor="#FF0000"
          strokeWeight={2}
          strokeOpacity={0.8}
          fillOpacity={0.0}
          clickable={false} />
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
          strokeColor="#0000FF"
          strokeWeight={1}
          strokeOpacity={0.8}
          fillOpacity={0.0}
          clickable={false} />
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
          strokeColor={(i === radarK - 1) ? "#000000" : VORONOI_COLOR[i % VORONOI_COLOR.length]}
          strokeWeight={1}
          strokeOpacity={0.8}
          fillOpacity={0.0}
          clickable={false} />
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

  return (
    <div className='Map-container' ref={mapElementRef}>

      <Map
        google={googleAPI}
        zoom={14}
        initialCenter={{ lat: 35.681236, lng: 139.767125 }}
        onReady={onMapReady}
        onClick={onMapClicked}
        onRightclick={onMapRightClicked}
        onDragstart={onMapDragStart}
        onIdle={onMapIdle}
        fullscreenControl={false}
        streetViewControl={false}
        zoomControl={true}
        gestureHandling={"greedy"}
        mapTypeControl={true}

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
      </Map>

      {InfoDialog}
      {currentPosDialog}
      {banner}
      <CurrentPosIcon onClick={requestCurrentPosition} />
    </div>
  )
}

const LoadingContainer = (props: any) => (
  <div className='Map-container'>Map is loading...</div>
)

export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_API_KEY,
  language: "ja",
  LoadingContainer: LoadingContainer,
})(MapContainer)


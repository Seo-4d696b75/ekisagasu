import { CircularProgress } from "@material-ui/core"
import { Circle, GoogleAPI, GoogleApiWrapper, Map, Marker, Polygon, Polyline } from "google-maps-react"
import { FC, useEffect, useMemo, useRef, useState } from "react"
import { useSelector } from "react-redux"
import { CSSTransition } from "react-transition-group"
import pin_location from "../../img/map_pin.svg"
import pin_station from "../../img/map_pin_station.svg"
import pin_station_extra from "../../img/map_pin_station_extra.svg"
import { RootState } from "../../script/mapState"
import StationService from "../../script/StationService"
import { CurrentPosDialog } from "../dialog/CurrentPosDialog"
import { useEventEffect } from "../hooks"
import { LineDialog } from "../dialog/LineDialog"
import { DialogType, isInfoDialog, isStationDialog, NavType } from "../navState"
import { StationDialog } from "../dialog/StationDialog"
import { useCurrentPosDialog, useInfoDialog } from "./dialogHook"
import "./Map.css"
import { useMapCallback } from "./mapEventHook"
import { useMapOperator } from "./mapHook"
import { CurrentPosIcon } from "./PositionIcon"
import { useServiceCallback } from "./serviceHook"
import { useProgressBanner } from "./progressHook"

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
    currentPositionUpdate,
    stations: voronoi,
    isDataExtraChange,
  } = useSelector((state: RootState) => state.mapState)

  const [screenWide, setScreenWide] = useState(false)

  const googleMapRef = useRef<google.maps.Map | null>(null)
  const mapElementRef = useRef<HTMLDivElement>(null)

  // callbacks registered to StationService
  const {
    onGeolocationPositionChanged,
    onStationLoaded,
  } = useServiceCallback()

  // banner shown while async task taking a long time
  const {
    banner,
    showProgressBannerWhile,
  } = useProgressBanner()

  // functions operating the map and its state variables
  const {
    highVoronoi,
    hideStationOnMap,
    showStation,
    showLine,
    moveToCurrentPosition,
    setCenterCurrentPosition,
    showRadarVoronoi,
    showPolyline,
    updateBounds,
    closeDialog,
    focusAt,
    focusAtNearestStation,
    requestCurrentPosition,
  } = useMapOperator(showProgressBannerWhile, googleMapRef, mapElementRef)

  // callbacks listening to map events
  const {
    onMapClicked,
    onMapRightClicked,
    onMapDragStart,
    onMapIdle,
    onMapReady,
  } = useMapCallback(screenWide, googleMapRef, showProgressBannerWhile, {
    focusAt,
    focusAtNearestStation,
    closeDialog,
    updateBounds,
    showPolyline,
    showRadarVoronoi,
    setCenterCurrentPosition
  })

  useEffect(() => {
    // componentDidMount
    StationService.onGeolocationPositionChangedCallback = onGeolocationPositionChanged
    StationService.onStationLoadedCallback = onStationLoaded
    const onScreenResized = () => {
      let wide = window.innerWidth >= 900
      setScreenWide(wide)
    }
    window.addEventListener("resize", onScreenResized)
    onScreenResized()
    return () => {
      // componentWillUnmount
      StationService.release()
      window.removeEventListener("resize", onScreenResized)
      googleMapRef.current = null
    }
  }, [onGeolocationPositionChanged, onStationLoaded])

  useEventEffect(focus, pos => {
    const map = googleMapRef.current
    if (map) {
      map.panTo(pos)
      if (map.getZoom() < 14) {
        map.setZoom(14)
      }
    }
  })

  useEventEffect(currentPositionUpdate, pos => {
    console.log("useEffect: location update")
    if (showCurrentPosition && nav.type === NavType.IDLE) {
      moveToCurrentPosition(new google.maps.LatLng(pos.lat, pos.lng))
    }
  })

  const dispatch = useDispatch<AppDispatch>()

  useEventEffect(isDataExtraChange, isExtra => {
    console.log("useEffect: data changed. extra:", isExtra)
    // ダイアログで表示中のデータと齟齬が発生する場合があるので強制的に閉じる
    closeDialog()
    // データセット変更時に地図で表示している現在の範囲に合わせて更新＆読み込みする
    const map = googleMapRef.current
    if (map) {
      showProgressBannerWhile(async () => {
        await StationService.switchData(isExtra ? "extra" : "main")
        dispatch(clearLoadedStation())
        await updateBounds(map, true)
      }, "駅データを切り替えています")
    }
  })

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
      icon={selectedStation?.impl ? pin_station : pin_station_extra} >
    </Marker>
  ), [selectedStation])

  const lineData = nav.type === NavType.DIALOG_LINE && nav.data.showPolyline ? nav.data : null
  const lineMarkers = useMemo(() => {
    if (lineData) {
      return lineData.stationMakers.map((s, i) => (
        <Marker
          key={i}
          position={s.position}
          icon={s.impl ? pin_station : pin_station_extra}>
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
          icon={s.impl ? pin_station : pin_station_extra}>
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

  // when dialog closed, dialog props will be undefined before animation completed.
  // so cache dialog props using ref object.
  const infoDialogProps = useInfoDialog(nav)

  const InfoDialog = (
    <CSSTransition
      in={isInfoDialog(nav)}
      className="Dialog-container"
      timeout={300}>
      <div className="Dialog-container">
        <div className="Dialog-frame">
          {(infoDialogProps?.type === DialogType.LINE) ? (
            <LineDialog
              info={infoDialogProps}
              onStationSelected={showStation}
              onClosed={closeDialog}
              onShowPolyline={showPolyline} />
          ) : (infoDialogProps?.type === DialogType.STATION ||
            infoDialogProps?.type === DialogType.SELECT_POSITION) ? (
            <StationDialog
              info={infoDialogProps}
              onStationSelected={showStation}
              onLineSelected={showLine}
              onClosed={closeDialog}
              onShowVoronoi={showRadarVoronoi} />
          ) : null}
        </div>
      </div>
    </CSSTransition>
  )

  const currentPosDialogProps = useCurrentPosDialog(nav)
  const currentPosDialog = (
    <CSSTransition
      in={showCurrentPosition}
      className="Dialog-container current-position"
      timeout={300}>
      <div className="Dialog-container current-position">
        <div className="Dialog-frame">
          {currentPosDialogProps ? (
            <CurrentPosDialog
              info={currentPosDialogProps}
              onStationSelected={showStation}
              onLineSelected={showLine} />
          ) : null}
        </div>
      </div>
    </CSSTransition>
  )

  return (
    <div className='Map-container'>
      <div className='Map-relative' ref={mapElementRef}>

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


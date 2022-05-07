import { CircularProgress } from "@material-ui/core"
import { Circle, GoogleAPI, GoogleApiWrapper, IMapProps, Map, Marker, Polygon, Polyline } from "google-maps-react"
import qs from "query-string"
import { FC, useEffect, useMemo, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useLocation } from "react-router-dom"
import { CSSTransition } from "react-transition-group"
import pin_location from "../../img/map_pin.svg"
import pin_station from "../../img/map_pin_station.svg"
import * as action from "../../script/actions_"
import { Line } from "../../script/Line"
import { LatLng } from "../../script/location"
import { RootState } from "../../script/mapState"
import { Station } from "../../script/Station"
import StationService from "../../script/StationService"
import { AppDispatch } from "../../script/store_"
import { get_bounds, get_zoom_property, parseQueryBoolean, PolylineProps, RectBounds } from "../../script/Utils"
import { CurrentPosDialog } from "../CurrentPosDialog"
import { useEventEffect, useRefCallback } from "../hooks"
import { LineDialog } from "../LineDialog"
import { CurrentPosDialogProps, DialogType, isInfoDialog, isStationDialog, LineDialogProps, NavState, NavType, SelectPosDialogProps, StationDialogProps } from "../MapNavState"
import { CurrentPosIcon } from "../MapSections"
import { StationDialog } from "../StationDialog"
import { useServiceCallback } from "./serviceHook"
import "./Map.css"
import { useHighVoronoi } from "./voronoiHook"

const VORONOI_COLOR = [
  "#0000FF",
  "#00AA00",
  "#FF0000",
  "#CCCC00"
]

const ZOOM_TH_VORONOI = 10
const ZOOM_TH_PIN = 12
const VORONOI_SIZE_TH = 500

interface MapProps {
  google: GoogleAPI
}

function getUIEvent(clickEvent: any): UIEvent {
  // googlemap onClick などのコールバック関数に渡させるイベントオブジェクトの中にあるUIEventを抽出
  // property名が謎
  // スマホではTouchEvent, マウスでは MouseEvent
  for (var p in clickEvent) {
    if (clickEvent[p] instanceof UIEvent) return clickEvent[p]
  }
  throw Error("UIEvent not found")
}

const MapContainer: FC<MapProps> = ({ google: googleAPI }) => {

  const {
    radarK,
    watchCurrentLocation: showCurrentPosition,
    showStationPin,
    nav,
    mapFocusRequest: focus,
    currentLocation,
    currentPositionUpdate,
    stations: voronoi,
  } = useSelector((state: RootState) => state.mapState)

  const [hideVoronoi, setHideVoronoi] = useState(false)
  const [hideStationPin, setHideStationPin] = useState(false)
  const [screenWide, setScreenWide] = useState(false)

  const googleMapRef = useRef<google.maps.Map | null>(null)
  const mapElementRef = useRef<HTMLDivElement>(null)
  const uiEventRef = useRef<UIEvent | null>(null)

  const dispatch = useDispatch<AppDispatch>()

  const {
    onGeolocationPositinoChanged,
    onStationLoaded,
  } = useServiceCallback()

  useEffect(() => {
    // componentDidMount
    StationService.onGeolocationPositionChangedCallback = onGeolocationPositinoChanged
    StationService.onStationLoadedCallback = onStationLoaded
    StationService.initialize()
    const onScreenResized = () => {
      let wide = window.innerWidth >= 900
      console.log("resize", window.innerWidth, wide)
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
  }, [onGeolocationPositinoChanged, onStationLoaded])

  const showStation = (station: Station) => {
    dispatch(action.requestShowStation(station))
  }

  const showLine = (line: Line) => {
    dispatch(action.requestShowLine(line))
  }

  const moveToCurrentPosition = (pos: google.maps.LatLng | null) => {
    dispatch(action.setNavStateIdle())
    const map = googleMapRef.current
    if (pos && map) {
      map.panTo(pos)
    }
  }

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

  const setCenterCurrentPosition = (map: google.maps.Map) => {
    // no move animation
    StationService.get_current_position().then(pos => {
      let latlng = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }
      map.setCenter(latlng)
      dispatch(action.setCurrentLocation(pos))
    }).catch(err => {
      console.log(err)
      alert("現在位置を利用できません. ブラウザから位置情報へのアクセスを許可してください.")
    })
  }

  const { run: runHighVoronoi, cancel: cancelHighVoronoi, highVoronoi, workerRunning } = useHighVoronoi(radarK, {
    onStart: (_) => dispatch(action.requestShowHighVoronoi()),
    onComplete: (station, list) => {
      const map = googleMapRef.current
      const mapElement = mapElementRef.current
      if (map && mapElement) {
        var rect = mapElement.getBoundingClientRect()
        var bounds = get_bounds(list[radarK - 1])
        var props = get_zoom_property(bounds, rect.width, rect.height, ZOOM_TH_VORONOI, station.position, 100)
        map.panTo(props.center)
        map.setZoom(props.zoom)
      }
    },
    onError: (_) => dispatch(action.setNavStateIdle()),
  })

  const showRadarVoronoi = (station: Station) => {
    if (!isStationDialog(nav)) return
    if (nav.data.showHighVoronoi) {
      dispatch(action.setNavStateIdle())
      return
    }
    runHighVoronoi(station)
  }

  const showPolyline = useRefCallback((line: Line) => {
    const map = googleMapRef.current
    if (!line.detail || !map) return
    if (nav.type !== NavType.DIALOG_LINE) return
    if (nav.data.showPolyline) return
    let polyline: PolylineProps[] = []
    let bounds: RectBounds
    if (line.detail.polylines) {
      polyline = line.detail.polylines
      bounds = line.detail
    } else {
      let stations = line.detail.stations
      let data = get_bounds(line.detail.stations)
      polyline = [{
        points: stations.map(s => s.position),
        start: stations[0].name,
        end: stations[stations.length - 1].name,
      }]
      bounds = data
    }
    dispatch(action.requestShowPolyline({
      dialog: nav.data.dialog,
      polylines: polyline,
      stations: line.detail.stations.map(s => s.position),
    }))
    const mapElement = mapElementRef.current
    if (mapElement) {
      var rect = mapElement.getBoundingClientRect()
      var props = get_zoom_property(bounds, rect.width, rect.height)

      map.panTo(props.center)
      map.setZoom(props.zoom)
      console.log('zoom to', props, line)
    }
  })

  const location = useLocation()

  const onMapReady = async (props?: IMapProps, map?: google.maps.Map, event?: any) => {
    console.log("map ready", props)
    if (map) {

      map.addListener("mousedown", event => uiEventRef.current = getUIEvent(event))
      googleMapRef.current = map
      map.setOptions({
        // this option can not be set via props in google-maps-react
        mapTypeControlOptions: {
          position: google.maps.ControlPosition.TOP_RIGHT,
          style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
        }
      })
      dispatch(action.setNavStateIdle())

      const s = await StationService.initialize()
      // parse query actions
      const query = qs.parse(location.search)
      if (typeof query.line == 'string') {
        console.log('query: line', query.line)
        var line = s.get_line_by_id(query.line)
        if (line) {
          try {
            let result = await dispatch(action.requestShowLine(line)).unwrap()
            showPolyline(result.line)
          } catch (e) {
            console.warn("fail to show line details. query:", query.line, e)
          }
          return
        }
      }
      if (typeof query.station == 'string') {
        console.log('query: station', query.station)
        try {
          let result = await dispatch(action.requestShowStationPromise(
            s.get_station_by_id(query.station)
          )).unwrap()
          if (typeof query.voronoi == 'string') {
            const str = query.voronoi.toLowerCase().trim()
            if (parseQueryBoolean(str)) {
              showRadarVoronoi(result.station)
            }
          }
        } catch (e) {
          console.warn("fail to show station, query:", query.station, e)
          setCenterCurrentPosition(map)
        }
        return
      }
      if (typeof query.mylocation == 'string') {
        console.log('query: location', query.mylocation)
        if (parseQueryBoolean(query.mylocation)) {
          dispatch(action.setWatchCurrentLocation(true))
        }
      }
      // if no query, set map center current position
      setCenterCurrentPosition(map)

    }
  }

  const updateBounds = (map: google.maps.Map) => {
    const bounds = map.getBounds()
    if (!bounds) return
    const zoom = map.getZoom()
    setHideVoronoi(zoom < ZOOM_TH_VORONOI)
    setHideStationPin(zoom < ZOOM_TH_PIN)
    if (zoom >= ZOOM_TH_VORONOI) {
      var ne = bounds.getNorthEast()
      var sw = bounds.getSouthWest()
      var margin = Math.max(ne.lat() - sw.lat(), ne.lng() - sw.lng()) * 0.5
      var rect = {
        south: sw.lat() - margin,
        north: ne.lat() + margin,
        west: sw.lng() - margin,
        east: ne.lng() + margin,
      }
      StationService.update_rect(rect, VORONOI_SIZE_TH)
    }
  }

  const onInfoDialogClosed = () => {
    // if any worker is running, terminate it
    cancelHighVoronoi()
    dispatch(action.setNavStateIdle())
  }

  const focusAt = (pos: LatLng) => {
    if (!StationService.initialized) return
    if (isStationDialog(nav) && nav.data.showHighVoronoi) return
    dispatch(action.requestShowSelectedPosition(pos))
  }

  const focusAtNearestStation = (pos: LatLng) => {
    if (!StationService.initialized) return
    if (isStationDialog(nav) && nav.data.showHighVoronoi) return
    StationService.update_location(pos, radarK, 0).then(s => {
      console.log("update location", s)
      if (s) dispatch(action.requestShowStation(s))
    })
  }

  const onMapClicked = (props?: IMapProps, map?: google.maps.Map, event?: any) => {
    const pos = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    }
    const previous = uiEventRef.current
    if (previous && getUIEvent(event).timeStamp - previous.timeStamp > 300) {
      console.log("map long clicked", pos, event)
      focusAt(pos)
    } else {
      console.log("map clicked", event)
      focusAtNearestStation(pos)
    }
  }

  const onMapRightClicked = (props?: IMapProps, map?: google.maps.Map, event?: any) => {
    const pos = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    }
    //console.log("right click", pos, event)
    focusAt(pos)
  }

  const onMapDragStart = (props?: IMapProps, map?: google.maps.Map) => {
    if (isStationDialog(nav) && nav.data.showHighVoronoi) return
    if (nav.type === NavType.DIALOG_LINE && nav.data.showPolyline) return
    if (!screenWide) {
      onInfoDialogClosed()
    }
  }

  const onMapIdle = (props?: IMapProps, map?: google.maps.Map, event?: any) => {
    if (StationService.initialized && map) {
      updateBounds(map)
    }
  }

  const currentPosition = currentLocation?.position
  const currentPositionMarker = useMemo(() => {
    if (showCurrentPosition && currentPosition) {
      console.log("render: map position marker")
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

  const selectedStationPos = isStationDialog(nav) ? nav.data.dialog.props.station.position : undefined
  const selectedStationMarker = useMemo(() => (
    <Marker
      visible={selectedStationPos !== undefined}
      position={selectedStationPos}
      icon={pin_station} >
    </Marker>
  ), [selectedStationPos])

  const lineData = nav.type === NavType.DIALOG_LINE && nav.data.showPolyline ? nav.data : null
  const lineMarkers = useMemo(() => {
    if (lineData) {
      console.log("render: map polyline marker")
      return lineData.stationMakers.map((pos, i) => (
        <Marker
          key={i}
          position={pos}
          icon={pin_station}>
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


  const showVoronoi = !hideVoronoi && !(isStationDialog(nav) && nav.data.showHighVoronoi)
  const voronoiPolygones = useMemo(() => {
    if (showVoronoi) {
      console.log("render: map voronoi")
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

  const showStationMarker = !hideStationPin && showStationPin && nav.type === NavType.IDLE && showVoronoi
  const stationMarkers = useMemo(() => {
    if (showStationMarker) {
      return voronoi.map((s, i) => (
        <Marker
          key={i}
          position={s.position}
          icon={pin_station}>
        </Marker>
      ))
    } else {
      return null
    }
  }, [showStationMarker, voronoi])

  const showHighVoronoi = isStationDialog(nav) && nav.data.showHighVoronoi
  const highVoronoiPolygones = useMemo(() => {
    if (showHighVoronoi) {
      console.log("render: map high vorornoi")
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

  const progressDialog = useMemo(() => (
    <CSSTransition
      in={workerRunning}
      className="Dialog-message"
      timeout={0}>
      {highVoronoi ? (
        <div className="Dialog-message">
          <div className="Progress-container">
            <CircularProgress
              value={highVoronoi.length * 100 / radarK}
              size={36}
              color="primary"
              thickness={5.0}
              variant="indeterminate" />
          </div>
          <div className="Wait-message">計算中…{(highVoronoi.length).toString().padStart(2)}/{radarK}</div>
        </div>
      ) : (<div>no message</div>)}
    </CSSTransition>
  ), [workerRunning, highVoronoi, radarK])

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
              onClosed={onInfoDialogClosed}
              onShowPolyline={showPolyline} />
          ) : (infoDialogProps?.type === DialogType.STATION ||
            infoDialogProps?.type === DialogType.SELECT_POSITION) ? (
            <StationDialog
              info={infoDialogProps}
              onStationSelected={showStation}
              onLineSelected={showLine}
              onClosed={onInfoDialogClosed}
              onShowVoronoi={showRadarVoronoi} />
          ) : null}
          {progressDialog}
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

  const onCurrentPosRequested = () => {
    if (showCurrentPosition) {
      if (currentPosition) {
        moveToCurrentPosition(new google.maps.LatLng(currentPosition.lat, currentPosition.lng))
      }
    } else {
      onInfoDialogClosed()
      StationService.get_current_position().then(pos => {
        moveToCurrentPosition(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude))
      })
    }
  }

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
          {voronoiPolygones}
          {stationMarkers}
          {highVoronoiPolygones}
        </Map>

        {InfoDialog}
        {currentPosDialog}
        <CurrentPosIcon onClick={onCurrentPosRequested} />
      </div>
    </div>
  )
}

type InfoDialogProps = StationDialogProps | SelectPosDialogProps | LineDialogProps

function useInfoDialog(nav: NavState): InfoDialogProps | undefined {
  const dialogPropsRef = useRef<InfoDialogProps>()
  if (isInfoDialog(nav)) {
    dialogPropsRef.current = nav.data.dialog
  }
  return dialogPropsRef.current
}

function useCurrentPosDialog(nav: NavState): CurrentPosDialogProps | undefined {
  const ref = useRef<CurrentPosDialogProps>()
  if (nav.type === NavType.IDLE && nav.data.dialog) {
    ref.current = nav.data.dialog
  }
  if (isInfoDialog(nav)) return undefined
  return ref.current
}

const LoadingContainer = (props: any) => (
  <div className='Map-container'>Map is loading...</div>
)

export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_API_KEY,
  language: "ja",
  LoadingContainer: LoadingContainer,
})(MapContainer)


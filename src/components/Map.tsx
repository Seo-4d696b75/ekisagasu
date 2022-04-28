import { GoogleApiWrapper, Map, Marker, Polygon, Polyline, Circle, GoogleAPI, IMapProps } from "google-maps-react"
import { FC, useEffect, useMemo, useRef, useState } from "react"
import "./Map.css"
import { LineDialog } from "./LineDialog"
import StationService from "../script/StationService"
import { CSSTransition } from "react-transition-group"
import * as Rect from "../diagram/Rect"
import pin_station from "../img/map_pin_station.svg"
import pin_location from "../img/map_pin.svg"
import * as Utils from "../script/Utils"
import VoronoiWorker from "worker-loader!./../script/VoronoiWorker";  // eslint-disable-line import/no-webpack-loader-syntax
import { CircularProgress } from "@material-ui/core"
import { Station } from "../script/Station"
import { Line } from "../script/Line"
import { GlobalState } from "../script/Reducer"
import * as Actions from "../script/Actions"
import { connect } from "react-redux"
import { PropsEvent } from "../script/Event"
import qs from "query-string"
import { CurrentPosDialog } from "./CurrentPosDialog"
import { StationDialog } from "./StationDialog"
import { NavState, NavType, isStationDialog, isDialog, DialogType } from "./MapNavState"
import { CurrentPosIcon } from "./MapSections"

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
  radarK: number
  showCurrentPosition: boolean
  showStationPin: boolean
  nav: NavState
  focus: PropsEvent<Utils.LatLng>
  currentLocation: Utils.CurrentLocation | null
  currentLocationUpdate: PropsEvent<google.maps.LatLng>
  voronoi: Station[]
  query: qs.ParsedQuery<string>
}

function mapGlobalState2Props(state: GlobalState, ownProps: any): MapProps {
  return {
    radarK: state.radar_k,
    showCurrentPosition: state.watch_position,
    showStationPin: state.show_station_pin,
    nav: state.nav,
    focus: state.map_focus,
    currentLocation: state.current_location,
    currentLocationUpdate: state.current_location_update,
    voronoi: state.stations,
    query: ownProps.query as qs.ParsedQuery<string>
  }
}

interface WrappedMapProps extends MapProps {
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

function showStation(station: Station) {
  Actions.requestShowStation(station)
}

function showLine(line: Line) {
  Actions.requestShowLine(line)
}

const MapContainer: FC<WrappedMapProps> = ({ google: googleAPI, radarK, showCurrentPosition, showStationPin, nav, focus, currentLocation, currentLocationUpdate, voronoi, query }) => {

  const [hideVoronoi, setHideVoronoi] = useState(false)
  const [hideStationPin, setHideStationPin] = useState(false)
  const [highVoronoi, setHighVoronoi] = useState<Utils.LatLng[][]>([])
  const [workerRunning, setWorkerRunning] = useState(false)
  const [screenWide, setScreenWide] = useState(false)

  const workerRef = useRef<Worker | null>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const mapElementRef = useRef<HTMLDivElement>(null)
  const uiEventRef = useRef<UIEvent | null>(null)

  useEffect(() => {
    // componentDidMount
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
  }, [])

  const moveToCurrentPosition = (pos: google.maps.LatLng | null) => {
    console.log("moveToCurrentPosition")
    Actions.setNavStateIdle()
    const map = googleMapRef.current
    if (pos && map) {
      map.panTo(pos)
    }
  }

  useEffect(() => {
    // componentDidUpdate
    focus.observe("map", pos => {
      const map = googleMapRef.current
      if (map) {
        map.panTo(pos)
        if (map.getZoom() < 14) {
          map.setZoom(14)
        }
      }
    })
    currentLocationUpdate.observe("map", (pos) => {
      console.log("useEffect: observe")
      if (showCurrentPosition && nav.type === NavType.IDLE) {
        moveToCurrentPosition(pos)
      }
    })
  })

  const setCenterCurrentPosition = (map: google.maps.Map) => {
    // no move animation
    StationService.get_current_position().then(pos => {
      let latlng = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }
      map.setCenter(latlng)
      Actions.setCurrentPosition(pos)
    }).catch(err => {
      console.log(err)
      alert("現在位置を利用できません. ブラウザから位置情報へのアクセスを許可してください.")
    })
  }

  const showRadarVoronoi = (station: Station) => {
    if (workerRunning) {
      console.log("worker is running")
      return
    }
    if (!isStationDialog(nav)) return
    if (nav.data.show_high_voronoi) {
      Actions.setNavStateIdle()
      return
    }
    const worker = new VoronoiWorker()
    // DO NOT refer to 'voronoi', which is always an empty list at time when the listener set to the worker.
    let list: Utils.LatLng[][] = []
    // register callback so that this process can listen message from worker
    worker.addEventListener("message", message => {
      const data = JSON.parse(message.data)
      if (data.type === 'points') {
        // point provide
        StationService.get_station(data.code).then(s => {
          return Promise.all(
            s.next.map(code => StationService.get_station(code))
          )
        }).then(stations => {
          var points = stations.map(s => {
            return {
              x: s.position.lng,
              y: s.position.lat,
              code: s.code
            }
          })
          worker.postMessage(JSON.stringify({
            type: 'points',
            code: data.code,
            points: points,
          }))
        })
      } else if (data.type === 'progress') {
        list = [
          ...list,
          data.polygon,
        ]
        setHighVoronoi(list)
      } else if (data.type === 'complete') {
        worker.terminate()
        workerRef.current = null
        setWorkerRunning(false)
        const map = googleMapRef.current
        const mapElement = mapElementRef.current
        if (map && mapElement) {
          var rect = mapElement.getBoundingClientRect()
          var bounds = Utils.get_bounds(list[radarK - 1])
          var props = Utils.get_zoom_property(bounds, rect.width, rect.height, ZOOM_TH_VORONOI, station.position, 100)
          map.panTo(props.center)
          map.setZoom(props.zoom)
        }
      } else if (data.type === "error") {
        console.error('fail to calc voronoi', data.err)
        worker.terminate()
        workerRef.current = null
        setWorkerRunning(false)
        Actions.setNavStateIdle()
      }
    })

    workerRef.current = worker

    var boundary = Rect.init(127, 46, 146, 26)
    var container = Rect.getContainer(boundary)
    var center = {
      x: station.position.lng,
      y: station.position.lat,
      code: station.code,
    }
    setWorkerRunning(true)
    setHighVoronoi([])
    Actions.showHighVoronoi(nav)
    worker.postMessage(JSON.stringify({
      type: 'start',
      container: container,
      k: radarK,
      center: center,
    }))
  }

  const showPolyline = (line: Line) => {
    const map = googleMapRef.current
    if (!line.has_details || !map) return
    if (nav.type !== NavType.DIALOG_LINE) return
    if (nav.data.show_polyline) return
    let polyline: Utils.PolylineProps[] = []
    let bounds: Utils.RectBounds
    if (line.polyline_list) {
      polyline = line.polyline_list
      bounds = line
    } else {
      let data = Utils.get_bounds(line.station_list)
      polyline = [{
        points: line.station_list.map(s => s.position),
        start: line.station_list[0].name,
        end: line.station_list[line.station_list.length - 1].name,
      }]
      bounds = data
    }
    Actions.showPolyline(
      nav.data.dialog,
      polyline,
      line.station_list.map(s => s.position)
    )
    const mapElement = mapElementRef.current
    if (mapElement) {
      var rect = mapElement.getBoundingClientRect()
      var props = Utils.get_zoom_property(bounds, rect.width, rect.height)

      map.panTo(props.center)
      map.setZoom(props.zoom)
      console.log('zoom to', props, line)
    }
  }

  const onMapReady = (props?: IMapProps, map?: google.maps.Map, event?: any) => {
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
      Actions.setNavStateIdle()

      StationService.initialize().then(s => {
        // parse query actions
        if (typeof query.line == 'string') {
          console.log('query: line', query.line)
          var line = s.get_line_by_id(query.line)
          if (line) {
            Actions.requestShowLine(line).then(l => {
              showPolyline(l)
            })
            return
          }
        }
        if (typeof query.station == 'string') {
          console.log('query: station', query.station)
          s.get_station_by_id(query.station).then(station => {
            if (station) {
              Actions.requestShowStation(station).then(() => {
                if (typeof query.voronoi == 'string') {
                  const str = query.voronoi.toLowerCase().trim()
                  if (Utils.parseQueryBoolean(str)) {
                    showRadarVoronoi(station)
                  }
                }
              })
            } else {
              setCenterCurrentPosition(map)
            }
          })
          return
        }
        if (typeof query.mylocation == 'string') {
          console.log('query: location', query.mylocation)
          if (Utils.parseQueryBoolean(query.mylocation)) {
            Actions.setWatchCurrentPosition(true)
          }
        }
        // if no query, set map center current position
        setCenterCurrentPosition(map)
      })
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
    const worker = workerRef.current
    if (workerRunning && worker) {
      worker.terminate()
      workerRef.current = null
      setWorkerRunning(false)
      console.log("worker terminated")
    }
    Actions.setNavStateIdle()
  }

  const focusAt = (pos: Utils.LatLng) => {
    if (!StationService.initialized) return
    if (isStationDialog(nav) && nav.data.show_high_voronoi) return
    Actions.requestShowPosition(pos)
  }

  const focusAtNearestStation = (pos: Utils.LatLng) => {
    if (!StationService.initialized) return
    if (isStationDialog(nav) && nav.data.show_high_voronoi) return
    StationService.update_location(pos, radarK, 0).then(s => {
      console.log("update location", s)
      if (s) Actions.requestShowStation(s)
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
    if (isStationDialog(nav) && nav.data.show_high_voronoi) return
    if (nav.type === NavType.DIALOG_LINE && nav.data.show_polyline) return
    if (screenWide) {
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

  const lineData = nav.type === NavType.DIALOG_LINE && nav.data.show_polyline ? nav.data : null
  const lineMarkers = useMemo(() => {
    if (lineData) {
      console.log("render: map polyline marker")
      return lineData.stations_marker.map((pos, i) => (
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
      return lineData.polyline_list.map((p, i) => (
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


  const showVoronoi = !hideVoronoi && !(isStationDialog(nav) && nav.data.show_high_voronoi)
  const voronoiPolygones = useMemo(() => {
    if (showVoronoi) {
      console.log("render: map voronoi")
      return voronoi.map((s, i) => (
        <Polygon
          key={i}
          paths={s.voronoi_points}
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

  const showHighVoronoi = isStationDialog(nav) && nav.data.show_high_voronoi
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

  const InfoDialog = (
    <CSSTransition
      in={isDialog(nav)}
      className="Dialog-container"
      timeout={400}>
      <div className="Dialog-container">
        <div className="Dialog-frame">
          {(nav.data?.dialog?.type === DialogType.LINE) ? (
            <LineDialog
              info={nav.data.dialog}
              onStationSelected={showStation}
              onClosed={onInfoDialogClosed}
              onShowPolyline={showPolyline} />
          ) : (nav.data?.dialog?.type === DialogType.STATION ||
            nav.data?.dialog?.type === DialogType.SELECT_POSITION) ? (
            <StationDialog
              info={nav.data.dialog}
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

  const currentPosDialog = (
    <CSSTransition
      in={showCurrentPosition}
      className="Dialog-container current-position"
      timeout={400}>
      <div className="Dialog-container current-position">
        <div className="Dialog-frame">
          {nav.type === NavType.IDLE && nav.data.dialog !== null ? (
            <CurrentPosDialog
              info={nav.data.dialog}
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
        moveToCurrentPosition(currentPosition)
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

const LoadingContainer = (props: any) => (
  <div className='Map-container'>Map is loading...</div>
)

export default connect(mapGlobalState2Props)(
  GoogleApiWrapper({
    apiKey: process.env.REACT_APP_API_KEY,
    language: "ja",
    LoadingContainer: LoadingContainer,
  })(MapContainer)
)


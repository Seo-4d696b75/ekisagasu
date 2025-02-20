import { Algorithm, MarkerClusterer, Renderer } from "@googlemaps/markerclusterer"
import { useGoogleMap } from "@react-google-maps/api"
import { createContext, ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { useRefCallback } from "../hooks"

export interface MarkerClusterProps {
  renderer?: Renderer,
  algorithm?: Algorithm,
  visible?: boolean | null | undefined,
  children?: ReactNode | null | undefined,
}

// each marker inside a cluster needs to know the cluster
export const MarkerClusterContext = createContext<{
  onAdded: (marker: google.maps.marker.AdvancedMarkerElement) => void,
  onRemoved: (marker: google.maps.marker.AdvancedMarkerElement) => void,
} | undefined>(undefined)

const MarkerCluster: React.FC<MarkerClusterProps> = ({ renderer, algorithm, children, visible = true }) => {
  const map = useGoogleMap()
  const [clusterer, setClusterer] = useState<MarkerClusterer>()

  // same set of markers added for the clusterer
  const markers = useRef(new Set<google.maps.marker.AdvancedMarkerElement>()).current

  // initialize
  useEffect(() => {
    if (map) {
      const clusterer = new MarkerClusterer({
        renderer: renderer,
        algorithm: algorithm,
        map: map,
      })
      setClusterer(clusterer)
      markers.clear()
      return () => {
        clusterer.clearMarkers()
        clusterer.setMap(null)
        setClusterer(undefined)
      }
    }
  }, [map, renderer, algorithm, markers])

  const [updateCount, setUpdate] = useState(0)
  const requestUpdate = useRefCallback(() => setUpdate(updateCount + 1))

  const context = useMemo(() => {
    if (clusterer) {
      return {
        onAdded: (marker: google.maps.marker.AdvancedMarkerElement) => {
          markers.add(marker)
          requestUpdate()
        },
        onRemoved: (marker: google.maps.marker.AdvancedMarkerElement) => {
          markers.delete(marker)
          requestUpdate()
        },
      }
    } else {
      return undefined
    }
  }, [clusterer, markers, requestUpdate])

  // rendering the clusterer every time a marker is added/removed causes performance problems
  // 1. add or remove each marker without clusterer rendering
  // 2. call setUpdate() and trigger a re-render
  // 3. in useEffect(), render the cluster
  useEffect(() => {
    if (!map || !clusterer) return

    if (visible) {
      clusterer.clearMarkers(true)
      markers.forEach(m => {
        m.map = map
        clusterer.addMarker(m, true)
      })
      // render only once after all the markers added/removed.
      clusterer.render()
    } else {
      // clear markers and render
      clusterer.clearMarkers()
      markers.forEach(m => m.map = null)
    }
  }, [map, clusterer, updateCount, visible, markers])

  return <MarkerClusterContext.Provider value={context}>
    {children}
  </MarkerClusterContext.Provider>
}

export default MarkerCluster
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

  // add and remove marker from clusterer
  const queue = useRef<{
    added: google.maps.marker.AdvancedMarkerElement[],
    removed: google.maps.marker.AdvancedMarkerElement[],
  }>({ added: [], removed: [] }).current
  const [updateCount, setUpdate] = useState(0)
  const requestUpdate = useRefCallback(() => setUpdate(updateCount + 1))

  const context = useMemo(() => {
    if (clusterer) {
      return {
        onAdded: (marker: google.maps.marker.AdvancedMarkerElement) => {
          queue.added.push(marker)
          requestUpdate()
        },
        onRemoved: (marker: google.maps.marker.AdvancedMarkerElement) => {
          queue.removed.push(marker)
          requestUpdate()
        },
      }
    } else {
      return undefined
    }
  }, [clusterer, queue, requestUpdate])

  // adding / removing markers one by one causes performance problem
  // 1. queue a marker if needs to be added or removed
  // 2. call setUpdate() and trigger a re-render
  // 3. in useEffect(), add and remove all the markers that have been queued by the next re-render
  useEffect(() => {
    if (!map || !clusterer) return

    if (visible) {
      queue.added.forEach(m => {
        m.map = map
        markers.add(m)
      })
      queue.removed.forEach(m => {
        m.map = null
        markers.delete(m)
      })
      clusterer.addMarkers(queue.added)
      clusterer.removeMarkers(queue.removed)
      queue.added.splice(0)
      queue.removed.slice(0)
    } else {
      clusterer.clearMarkers()
      markers.forEach(m => queue.added.push(m))
      queue.added.forEach(m => m.map = null)
      markers.clear()
    }
  }, [map, clusterer, updateCount, queue, visible, markers])

  return <MarkerClusterContext.Provider value={context}>
    {children}
  </MarkerClusterContext.Provider>
}

export default MarkerCluster
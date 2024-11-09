import { Algorithm, MarkerClusterer, Renderer } from "@googlemaps/markerclusterer"
import { useGoogleMap } from "@react-google-maps/api"
import { createContext, ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { useRefCallback } from "../hooks"

export interface MarkerClusterProps {
  renderer?: Renderer,
  algorithm?: Algorithm,
  children?: ReactNode | null | undefined,
}

export const MarkerClusterContext = createContext<{
  onAdded: (marker: google.maps.marker.AdvancedMarkerElement) => void,
  onRemoved: (marker: google.maps.marker.AdvancedMarkerElement) => void,
} | undefined>(undefined)

// react-google-maps/api は AdvancedMarker に対応していないためClustererも独自実装で対応する
const MarkerCluster: React.FC<MarkerClusterProps> = ({ renderer, algorithm, children }) => {
  const map = useGoogleMap()
  const clustererRef = useRef<MarkerClusterer>()
  // 初期化・後処理
  useEffect(() => {
    if (map) {
      const clusterer = new MarkerClusterer({
        renderer: renderer,
        algorithm: algorithm,
        map: map,
      })
      clustererRef.current = clusterer
      return () => {
        clusterer.clearMarkers()
        clusterer.setMap(null)
        clustererRef.current = undefined
      }
    }
  }, [map, renderer, algorithm])

  const clusterer = clustererRef.current

  // マーカーの追加・削除
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
  // ひとつずつ追加・削除するとパフォーマンスが悪い
  useEffect(() => {
    if (clusterer) {
      clusterer.addMarkers(queue.added)
      clusterer.removeMarkers(queue.removed)
      queue.added.splice(0)
      queue.removed.slice(0)
    }
  }, [clusterer, updateCount, queue])

  return <MarkerClusterContext.Provider value={context}>
    {children}
  </MarkerClusterContext.Provider>
}

export default MarkerCluster
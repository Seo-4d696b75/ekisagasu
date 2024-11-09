import { useGoogleMap } from "@react-google-maps/api"
import React, { useContext, useEffect, useRef } from "react"
import { createRoot, Root } from "react-dom/client"
import { MarkerClusterContext } from "./MarkerCluster"

export interface AdvancedMarkerProps {
    position: google.maps.LatLngLiteral | null | undefined
    children: React.ReactNode | null | undefined
    /** normalized horizontal position of anchor. default: 0.5 */
    anchorX?: number | null | undefined
    /** normalized vertical position of anchor. default: 1.0 */
    anchorY?: number | null | undefined
}

// react-google-maps/api は AdvancedMarker に対応していないため独自実装で対応する
// https://github.com/JustFly1984/react-google-maps-api/issues/3250
const AdvancedMarker: React.FC<AdvancedMarkerProps> = ({ position, children, anchorX, anchorY }) => {
    const map = useGoogleMap()
    const cluster = useContext(MarkerClusterContext)

    const stateRef = useRef<{
        marker: google.maps.marker.AdvancedMarkerElement,
        root: Root,
    }>()
    // 初期化・後処理
    useEffect(() => {
        if (map) {
            const container = document.createElement('div')
            const root = createRoot(container)
            const marker = new google.maps.marker.AdvancedMarkerElement({
                map: map,
                content: container,
            })
            stateRef.current = {
                marker: marker,
                root: root,
            }
            return () => {
                marker.map = undefined
                stateRef.current = undefined
                setTimeout(() => root.unmount())
                // clusterから削除
                cluster?.onRemoved?.(marker)
            }
        }
    }, [map])
    // マーカーの更新
    const state = stateRef.current
    useEffect(() => {
        if (state) {
            state.marker.position = position
            // AdvancedMarkerElementでanchor位置を指定できない？
            const x = (0.5 - (anchorX ?? 0.5)) * 100
            const y = (1 - (anchorY ?? 1)) * 100
            state.root.render(
                <div style={{ translate: `${x}% ${y}%` }}>
                    {children}
                </div>
            )
        }
    }, [state, position, children])

    // clusterへ追加
    useEffect(() => {
        if (state && cluster) {
            cluster.onAdded(state.marker)
        }
    }, [state, cluster])
    return <></>
}

export default AdvancedMarker
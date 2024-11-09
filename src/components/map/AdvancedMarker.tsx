import { useGoogleMap } from "@react-google-maps/api"
import React, { useEffect, useRef } from "react"
import { createRoot, Root } from "react-dom/client"

export interface AdvancedMarkerProps {
    position: google.maps.LatLngLiteral | null | undefined
    children: React.ReactNode | null | undefined
}

// react-google-maps/api は AdvancedMarker に対応していないため独自実装で対応する
// https://github.com/JustFly1984/react-google-maps-api/issues/3250
const AdvancedMarker: React.FC<AdvancedMarkerProps> = ({ position, children }) => {
    const map = useGoogleMap()
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
            }
        }
    }, [map])
    // マーカーの更新
    useEffect(() => {
        const state = stateRef.current
        if (state) {
            state.marker.position = position
            state.root.render(children)
        }
    }, [position, children])
    return <></>
}

export default AdvancedMarker
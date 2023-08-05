import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { DataType } from "../../script/StationService"
import { MapCenter } from "../../script/location"
import { NavState, NavType } from "../navState"

export const useQueryEffect = (
  nav: NavState,
  dataType: DataType | null,
  watchCurrentLocation: boolean,
  mapCenter: MapCenter,
) => {
  const [, setQuery] = useSearchParams()

  useEffect(() => {

    const query: Record<string, string> = {}
    if (dataType === 'extra') {
      query['extra'] = '1'
    }
    if (nav.type === NavType.DIALOG_LINE) {
      query['line'] = nav.data.dialog.props.line.code.toString()
    } else if (nav.type === NavType.DIALOG_STATION_POS) {
      query['station'] = nav.data.dialog.props.station.code.toString()
      if (nav.data.showHighVoronoi) {
        query['voronoi'] = '1'
      }
    } else if (nav.type === NavType.DIALOG_SELECT_POS) {
      const pos = nav.data.dialog.props.position
      query['lat'] = pos.lat.toFixed(6)
      query['lng'] = pos.lng.toFixed(6)
      query['zoom'] = mapCenter.zoom.toFixed(1)
      query['dialog'] = '1'
    } else if (!watchCurrentLocation) {
      query['lat'] = mapCenter.lat.toFixed(6)
      query['lng'] = mapCenter.lng.toFixed(6)
      query['zoom'] = mapCenter.zoom.toFixed(1)
    } else {
      query['mylocation'] = '1'
    }

    setQuery(query)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav, dataType, watchCurrentLocation, mapCenter])
}

import { useDispatch } from "react-redux"
import { Station } from "../../data/station"
import { CurrentLocation } from "../../location/location"
import * as action from "../../redux/actions"
import { AppDispatch } from "../../redux/store"
import { useRefCallback } from "../hooks"

/**
 * serviceに登録するコールバック関数を取得する
 * @returns 
 */
export const useServiceCallback = () => {
  const dispatch = useDispatch<AppDispatch>()

  const onLocationChanged = useRefCallback((location: CurrentLocation) => {
    dispatch(action.setCurrentLocation(location))
  })

  const onStationLoaded = useRefCallback((list: Station[]) => {
    dispatch(action.appendLoadedStation(list))
  })

  return {
    onLocationChanged,
    onStationLoaded,
  }
}
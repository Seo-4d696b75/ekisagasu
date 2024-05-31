import { useDispatch } from "react-redux"
import { Station } from "../../model/station"
import * as action from "../../redux/actions"
import { AppDispatch } from "../../redux/store"
import { useRefCallback } from "../hooks"

/**
 * serviceに登録するコールバック関数を取得する
 * @returns 
 */
export const useServiceCallback = (progressHandler: (task: Promise<void>, text: string) => any) => {
  const dispatch = useDispatch<AppDispatch>()

  const onGeolocationPositionChanged = useRefCallback((pos: GeolocationPosition) => {
    dispatch(action.setCurrentLocation(pos))
  })

  const onStationLoaded = useRefCallback((list: Station[]) => {
    dispatch(action.appendLoadedStation(list))
  })

  const dataLoadingCallback = useRefCallback((message, promise) => {
    progressHandler(promise, message)
  })

  return {
    onGeolocationPositionChanged,
    onStationLoaded,
    dataLoadingCallback,
  }
}
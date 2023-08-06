import { useDispatch } from "react-redux"
import * as action from "../../script/actions"
import { Station } from "../../script/station"
import { AppDispatch } from "../../script/store"
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
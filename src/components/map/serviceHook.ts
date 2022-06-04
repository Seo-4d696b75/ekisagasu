import { useCallback } from "react"
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

  const onGeolocationPositionChanged = useCallback((pos: GeolocationPosition) => {
    dispatch(action.setCurrentLocation(pos))
  }, [dispatch])

  const onStationLoaded = useCallback((list: Station[]) => {
    dispatch(action.appendLoadedStation(list))
  }, [dispatch])

  const onDataLoadingStarted = useRefCallback((url, promise) => {
    progressHandler(promise, "データ読み込み中")
  })

  return {
    onGeolocationPositionChanged,
    onStationLoaded,
    onDataLoadingStarted,
  }
}
import { useCallback } from "react"
import { useDispatch } from "react-redux"
import * as action from "../../script/actions"
import { Station } from "../../script/Station"
import { AppDispatch } from "../../script/store"

/**
 * serviceに登録するコールバック関数を取得する
 * @returns 
 */
export const useServiceCallback = () => {
  const dispatch = useDispatch<AppDispatch>()

  const onGeolocationPositinoChanged = useCallback((pos: GeolocationPosition) => {
    dispatch(action.setCurrentLocation(pos))
  }, [dispatch])

  const onStationLoaded = useCallback((list: Station[]) => {
    dispatch(action.appendLoadedStation(list))
  }, [dispatch])

  return {
    onGeolocationPositinoChanged,
    onStationLoaded,
  }
}
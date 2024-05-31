import { logger } from "../logger"
import { CurrentLocation } from "./location"

function parseLocation(location: GeolocationPosition): CurrentLocation {
  return {
    position: {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    },
    accuracy: location.coords.accuracy,
    heading: location.coords.heading,
  }
}

export class LocationRepository {

  /**
   * 現在位置を監視している場合に変更された位置情報をコールバックする
   */
  onLocationChangedCallback: ((location: CurrentLocation) => void) | undefined = undefined


  positionOptions: PositionOptions = {
    timeout: 5000,
    maximumAge: 100,
    enableHighAccuracy: false,
  }

  /**
   * 現在登録した位置情報取得コールバックのid
   */
  navigatorId: number | null = null

  setPositionHighAccuracy(value: boolean) {
    logger.d("position accuracy changed", value)
    this.positionOptions.enableHighAccuracy = value
    if (this.navigatorId) {
      this.setWatchCurrentPosition(false)
      this.setWatchCurrentPosition(true)
    }
  }

  setWatchCurrentPosition(enable: boolean) {
    if (enable) {
      if (navigator.geolocation) {
        if (this.navigatorId) {
          logger.d("already set")
          return
        }
        this.navigatorId = navigator.geolocation.watchPosition(
          (pos) => {
            // TODO reduxの状態管理に移行してコールバック排除
            this.onLocationChangedCallback?.(parseLocation(pos))
          },
          (err) => {
            logger.e(err)
          },
          this.positionOptions
        )
        logger.d("start watching position", this.positionOptions)
      } else {
        logger.w("this device does not support Geolocation")
      }
    } else {
      if (this.navigatorId) {
        navigator.geolocation.clearWatch(this.navigatorId)
        this.navigatorId = null
        logger.d("stop watching position")
      }
    }
  }

  getCurrentLocation(): Promise<CurrentLocation> {
    if (navigator.geolocation) {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve(parseLocation(pos))
          },
          (err) => {
            reject(err)
          },
          this.positionOptions
        )
      })
    } else {
      return Promise.reject(Error("this device does not support Geolocation"))
    }
  }

  release() {
    this.onLocationChangedCallback = undefined
    if (this.navigatorId) {
      this.setWatchCurrentPosition(false)
    }
  }
}

const repository = new LocationRepository()

export default repository
import { logger } from "../logger"
import { Location } from "./location"

function parseLocation(location: GeolocationPosition): Location {
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

  positionOptions: PositionOptions = {
    timeout: 5000,
    maximumAge: 100,
    enableHighAccuracy: false,
  }

  /**
   * 現在登録した位置情報取得コールバックのid
   */
  navigatorId: number | null = null

  onCurrentLocationChanged: (Location: Location) => Promise<any>

  constructor(
    onCurrentLocationChanged: (location: Location) => Promise<any>
  ) {
    this.onCurrentLocationChanged = onCurrentLocationChanged
  }

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
          async (pos) => {
            const location = parseLocation(pos)
            await this.onCurrentLocationChanged(location)
          },
          (err) => {
            logger.w('failed to watch location', err)
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

  getCurrentLocation(): Promise<Location> {
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
    if (this.navigatorId) {
      this.setWatchCurrentPosition(false)
    }
  }
}

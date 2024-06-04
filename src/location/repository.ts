import { setCurrentLocation } from "../redux/actions"
import { store } from "../redux/store"
import { LocationRepository } from "./LocationRepository"

const repository = new LocationRepository(
  (location) => store.dispatch(setCurrentLocation(location))
)

export default repository
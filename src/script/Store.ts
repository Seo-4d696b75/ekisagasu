import liveData from "./LiveData"
import { Station } from "./Station"
import { Line } from "./Line"

const store = {
  radar_k: liveData(22),
  watch_position: liveData(false),
  current_position: liveData<GeolocationPosition>(),
  high_accuracy: liveData(false),
  show_request: liveData<Station|Line>(),
}

export default store
import { appendLoadedStation, clearLoadedStation } from "../redux/actions";
import { store } from "../redux/store";
import { StationRepository } from "./StationRepository";

// redux実装をrepositoryのロジックと分離する
// common.jsベースのjestでstore + actionをimportすると失敗する
const repository = new StationRepository(
  () => store.dispatch(clearLoadedStation()),
  (stations) => store.dispatch(appendLoadedStation(stations)),
)

export default repository
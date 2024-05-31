import { DataType } from "../../data/StationRepository";
import { Station } from "../../data/station";

export interface StationDataState {
  /** 
   * 駅データセットの種類 
   * 
   * null: 未初期化
   */
  dataType: DataType | null
  /** 駅一覧 */
  stations: Station[]
}

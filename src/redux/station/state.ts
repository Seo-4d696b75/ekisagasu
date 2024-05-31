import { Station } from "../../model/station";
import { DataType } from "../../script/StationService";

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

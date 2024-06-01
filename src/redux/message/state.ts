
/**
 * アプリ共通のメッセージモデル
 * 
 * 非同期処理など時間の要する処理の実行中に表示する
 */
export interface MessageEntry {
  id: number
  message: string
}

export interface MessageState {
  nextId: number
  queue: MessageEntry[]
  message: string | null
}
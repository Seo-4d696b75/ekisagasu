import { CircularProgress } from "@material-ui/core"
import { useMemo, useRef, useState } from "react"
import { CSSTransition } from "react-transition-group"
import { logger } from "../../logger"

interface MessageEntry {
  id: number
  message: string
}

export interface ProgressHandler {
  (
    message: string,
    computation: Promise<any> | (() => Promise<any>),
  ): Promise<void>
}

/**
 * アプリ共通の非同期処理を実行するUIロジック
 * 
 * - 実行中はメッセージを表示する
 * - 任意の例外を握りつぶす
 * 
 * @returns 実行中のメッセージ表示と呼び出し関数
 */
export const useProgressBanner = () => {
  const [show, setShow] = useState(false)
  const [text, setText] = useState("")
  const queueRef = useRef<MessageEntry[]>([])
  const idRef = useRef(0)

  const banner = useMemo(() => (
    <div className="progress-banner-container">
      <CSSTransition
        in={show}
        className="progress-banner"
        timeout={0}>
        <div className="progress-banner">
          <div className="progress-container">
            <CircularProgress
              value={100}
              size={22}
              color="primary"
              thickness={5.0}
              variant="indeterminate" />
          </div>
          <div className="progress-message">{text}</div>
        </div>
      </CSSTransition>
    </div>
  ), [show, text])

  const showProgressBannerWhile: ProgressHandler = async (message, computation) => {
    const id = idRef.current
    idRef.current = id + 1
    const queue = queueRef.current
    queue.push({
      id: id,
      message: message
    })
    const task = (typeof computation === "function") ? computation() : computation
    try {
      setText(queue[0].message)
      setShow(true)
      await task
    } catch (e) {
      // TODO エラー表示が必要？
      // エラーは握りつぶす
      logger.w(`uncaught error found while progress(message: ${message})`, e)
    } finally {
      const idx = queue.findIndex(e => e.id === id)
      queue.splice(idx, 1)
      if (queue.length === 0) {
        setShow(false)
      } else {
        setText(queue[0].message)
      }
    }
  }

  return {
    banner,
    showProgressBannerWhile,
  }
}
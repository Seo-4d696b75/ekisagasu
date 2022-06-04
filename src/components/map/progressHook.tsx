import { CircularProgress } from "@material-ui/core"
import { useMemo, useRef, useState } from "react"
import { CSSTransition } from "react-transition-group"

interface MessageEntry {
  id: number
  text: string
}

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

  const showProgressBannerWhile = async <T,>(computation: Promise<T> | (() => Promise<T>), text: string): Promise<T> => {
    const id = idRef.current
    idRef.current = id + 1
    const queue = queueRef.current
    queue.push({
      id: id,
      text: text
    })
    const task = (typeof computation === "function") ? computation() : computation
    try {
      if (queue.length === 1) {
        setText(text)
        setShow(true)
      }
      return await task
    } finally {
      const idx = queue.findIndex(e => e.id === id)
      queue.splice(idx, 1)
      let len = queue.length
      if (len === 0) {
        setShow(false)
      } else {
        setText(queue[0].text)
      }
    }
  }

  return {
    banner,
    showProgressBannerWhile,
  }
}
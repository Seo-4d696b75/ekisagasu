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
  const stackRef = useRef<MessageEntry[]>([])
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

  const showProgressBannerWhile = async <T,>(task: Promise<T>, text: string): Promise<T> => {
    const id = idRef.current
    idRef.current = id + 1
    const stack = stackRef.current
    stack.push({
      id: id,
      text: text
    })
    try {
      setText(text)
      setShow(true)
      return await task
    } finally {
      const idx = stack.findIndex(e => e.id === id)
      stack.splice(idx, 1)
      let len = stack.length
      if (len === 0) {
        setShow(false)
      } else {
        setText(stack[len - 1].text)
      }
    }
  }

  return {
    banner,
    showProgressBannerWhile,
  }
}
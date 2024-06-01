import { CircularProgress } from "@material-ui/core"
import { useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { CSSTransition } from "react-transition-group"
import { logger } from "../../logger"
import * as action from "../../redux/actions"
import { selectMessageState } from "../../redux/selector"
import { AppDispatch } from "../../redux/store"

interface MessageEntry {
  id: number
  text: string
}

export const useProgressBanner = () => {

  const { message } = useSelector(selectMessageState)

  const banner = useMemo(() => (
    <div className="progress-banner-container">
      <CSSTransition
        in={message !== null}
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
          <div className="progress-message">{message}</div>
        </div>
      </CSSTransition>
    </div>
  ), [message])

  const dispatch = useDispatch<AppDispatch>()

  const showProgressBannerWhile = async <T,>(
    message: string,
    computation: Promise<T> | (() => Promise<T>),
  ): Promise<T> => {
    const task = (typeof computation === "function") ? computation() : computation
    const { id } = await dispatch(action.showMessage(message)).unwrap()
    try {
      return await task
    } catch (e) {
      logger.w(e)
      throw e
    } finally {
      dispatch(action.hideMessage(id))
    }
  }

  return {
    banner,
    showProgressBannerWhile,
  }
}
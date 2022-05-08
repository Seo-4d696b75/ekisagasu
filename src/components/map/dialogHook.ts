import { useRef } from "react"
import { CurrentPosDialogProps, isInfoDialog, LineDialogProps, NavState, NavType, SelectPosDialogProps, StationDialogProps } from "../navState"

export type InfoDialogProps = StationDialogProps | SelectPosDialogProps | LineDialogProps

export const useInfoDialog = (nav: NavState): InfoDialogProps | undefined => {
  const dialogPropsRef = useRef<InfoDialogProps>()
  if (isInfoDialog(nav)) {
    dialogPropsRef.current = nav.data.dialog
  }
  return dialogPropsRef.current
}

export const useCurrentPosDialog = (nav: NavState): CurrentPosDialogProps | undefined => {
  const ref = useRef<CurrentPosDialogProps>()
  if (nav.type === NavType.IDLE && nav.data.dialog) {
    ref.current = nav.data.dialog
  }
  if (isInfoDialog(nav)) return undefined
  return ref.current
}
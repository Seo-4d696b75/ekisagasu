import { FC, useRef } from "react";
import ic_mylocation from "../img/ic_mylocation.png"

export const CurrentPosIcon: FC<{onClick: () => void}> = ({onClick}) => {
  const onClickRef = useRef<()=>void>()
  onClickRef.current = onClick

  return (
    <div className="menu mylocation">
      <img
        src={ic_mylocation}
        alt="move to current location"
        className="icon mylocation"
        onClick={() => onClickRef.current?.()}></img>
    </div>
  )
}
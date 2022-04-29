import { FC } from "react";
import ic_mylocation from "../img/ic_mylocation.png";
import { useRefCallback } from "./Hooks";

export const CurrentPosIcon: FC<{onClick: () => void}> = ({onClick}) => {

  const onClickRef = useRefCallback<()=>void>(onClick)

  return (
    <div className="menu mylocation">
      <img
        src={ic_mylocation}
        alt="move to current location"
        className="icon mylocation"
        onClick={onClickRef}></img>
    </div>
  )
}
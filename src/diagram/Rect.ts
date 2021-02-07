import {Rect, DiagramError, Triangle} from "./types"
import * as point from "./Point"
import * as triangle from "./Triangle"

class RectInitError extends DiagramError {
  constructor(mes: string){
    super(mes)
  }
}

export function  init(left: number, top: number, right: number, bottom: number): Rect {
  if ( Number.isFinite(left) && Number.isFinite(right) && left < right 
  && Number.isFinite(top) && Number.isFinite(bottom) && bottom < top ){
    return {
      left: left,
      top: top,
      right: right,
      bottom: bottom,
    }
  }
  throw new RectInitError("invalide args")
}

export function getContainer(rect: Rect): Triangle {
  
  var x = (rect.left + rect.right) / 2;
  var y = (rect.top + rect.bottom) / 2;
  var r = Math.sqrt(Math.pow(rect.left-rect.right,2) + Math.pow(rect.top-rect.bottom,2));
  var a = point.init(x-Math.sqrt(3)*r, y+r);
  var b = point.init(x+Math.sqrt(3)*r, y+r);
  var c = point.init(x, y-2*r);
  return triangle.init(a,b,c);
}
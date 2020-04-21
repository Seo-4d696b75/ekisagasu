import * as Triangle from "./Triangle";
import * as Point from "./Point";

export function init(left,top,right,bottom){
	return {
		left: left,
		top: top,
		right: right,
		bottom: bottom,
	};
}

export function getContainer(rect){
	var x = (rect.left + rect.right)/2;
	var y = (rect.top + rect.bottom)/2;
	var r = Math.sqrt(Math.pow(rect.left - rect.right, 2) + Math.pow(rect.top - rect.bottom ,2));
	var a = Point.init(x - Math.sqrt(3)*r, y+r);
	var b = Point.init(x + Math.sqrt(3)*r, y+r);
	var c = Point.init(x, y - 2*r);
	return Triangle.init(a, b, c);
}

export function getWidth(rect){
	return rect.right - rect.left;
}

export function getHeight(rect){
	return rect.top - rect.bottom;
}

export function getCenter(rect){
	return {
		x: (rect.right + rect.left)/2,
		y: (rect.top + rect.bottom) /2,
	};
}
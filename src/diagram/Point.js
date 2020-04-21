import {stringHash} from "./utils";

export function init(x,y){
	return {
		x: x,
		y: y
	};
}

export function equals(p1,p2){
	return p1.x === p2.x && p1.y === p2.y;
}

export function hashCode(point){
	var str = `${point.x.toString()},${point.y.toString}`;
	return stringHash(str);
}

export function getDivision(p1,p2,index){
	return {
		x: p1.x * (1.0-index) + p2.x * index,
		y: p1.y * (1.0-index) + p2.y * index,
	};
}

export function measure(p1,p2){
	return Math.sqrt(
		Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
	);
}

export function getMiddlePoint(p1,p2){
	return {
		x: (p1.x + p2.x)/2,
		y: (p1.y + p2.y)/2,
	};
}

export function compare(p1,p2){
	if ( p1.x === p2.x ){
		if ( p1.y === p2.y ){
			return 0;
		} else if ( p1.y < p2.y ){
			return -1;
		} else {
			return 1;
		}
	} else if ( p1.x < p2.x ){
		return -1;
	} else {
		return 1;
	}
}
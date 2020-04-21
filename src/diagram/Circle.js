import * as Point from "./Point";


export function init(center, radius){
	return {
		center: center,
		radius: radius,
	};
}

export function containsPoint(circle, point){
	return Point.measure(point, circle.center) < circle.radius;
}

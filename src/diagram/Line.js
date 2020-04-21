import * as Point from "./Point";
import * as Edge from "./Edge";

export function init(a,b,c){
	if ( typeof a === "number" && typeof b === "number" ){
		if ( typeof c === "number" ){
			if ( b === 0 ){
				if ( a === 0 ){
					console.error("Line::init > a = b = 0");
					return null;
				}
				return  {
					a: 1.0,
					b: 0.0,
					c: c/a,
				};
			}else{
				return {
					a: a/b,
					b: 1.0,
					c: c/b,
				};
			}
		}else {
			return {
				a: -a,
				b: 1.0,
				c: -b,
			};
		}
	} else if ( a.x && a.y && b.x && b.y ){
		if ( Point.equals(a, b) ){
			console.error("same point not defines a line.");
			return null;
		} else if ( a.x === b.x ){
			return {
				a: 1.0,
				b: 0.0,
				c: -(a.x + b.x)/2,
			};
		} else {
			return {
				a: (b.y - a.y)/(a.x - b.x),
				b: 1.0,
				c: (b.x*a.y - a.x*b.y)/(a.x - b.x),
			};
		}
	}
}

/**
 * 
 * @param {line/point} a 
 * @param {point} b 
 * @param {point} c 
 */
export function onLine(a,b,c){
	if ( a.a && a.b && a.c ){
		var line = a;
		var point = b;
		return Math.abs(line.a * point.x + line.b * point.y + c) === 0;
	}
	var v = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
	return v === 0;
}

export function equals(l1,l2){
	return l1.a === l2.a && l1.b === l2.b && l1.c === l2.c;
}

export function getIntersection(l1,l2){
	if ( l2.a && l2.b ){
		// l1:Line l2:Edge
		var line = l1;
		var edge = l2;
		if ( (line.a * edge.a.x + line.b * edge.a.y + line.c) * (line.a * edge.b.x + line.b * edge.b.y + line.c) <= 0 ){
			l2 = Edge.toLine(edge);
		} else {
			return null;
		}
	}
	// l1:Line l2:Line
	var det = l1.a * l2.b - l2.a * l1.b;
	if ( det === 0 ){
		return null;
	} else {
		return {
			x: (l1.b * l2.c - l2.b * l1.c)/det,
			y: (l2.a * l1.c - l1.a * l2.c)/det,
		};
	}
}

export function getPerpendicularBisector(p1,p2){
	if ( p1.a && p1.b && !p2 ){
		// p1:Edge p2:null
		var edge = p1;
		p1 = edge.a;
		p2 = edge.b;
	}
	// p1,p2:Point
	return {
		a: p1.x - p2.x,
		b: p1.y - p2.y,
		c: ( -Math.pow(p1.x,2) - Math.pow(p1.y,2) + Math.pow(p2.x,2) + Math.pow(p2.y,2))/2,
	};
}

export function getDistance(line,point){
	return Math.abs(point.x * line.a + point.y * line.b + line.c ) / Math.sqrt(line.a * line.a + line.b * line.b);
}

export function onSameSide(line,p1,p2){
	var v1 = line.a * p1.x + line.b * p1.y + line.c;
	var v2 = line.a * p2.x + line.b * p2.y + line.c;
	return v1 * v2 >= 0;
}

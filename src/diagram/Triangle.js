import * as Line from "./Line";
import * as Point from "./Point";
import * as Edge from "./Edge";
import * as Circle from "./Circle";

export function init(a,b,c){
	if ( a.a && a.b ){
		var edge = a;
		c = b;
		b = edge.b;
		a = edge.a;
	}
	if ( Line.onLine(a,b,c) ) return null;
	var array = [a,b,c].sort(Point.compare);
	return {
		a: array[0],
		b: array[1],
		c: array[2],
	};
}

/**
 * 同値判定
 * @param {triangle} self 
 * @param {triangle} other 
 */
export function equals(self,other){
	return Point.equals(self.a,other.a) && Point.equals(self.b,other.b) && Point.equals(self.c, other.c);
}

export function hashCode(t){
	var hash = 17;
	hash = 31 * hash + Point.hashCode(t.a);
	hash = 31 * hash + Point.hashCode(t.b);
	hash = 31 * hash + Point.hashCode(t.c);
	return hash & hash;
}

/**
 * 三角形との交点をすべて取得する
 * @param {triangle} triangle 
 * @param {line/edge} line 
 * @return {array} Pointの自然順序付けに従いソートされた交点のリスト 0 <= array.length <= 3
 */
export function getIntersection(triangle,line){
	var ab = Edge.init(triangle.a, triangle.b);
	var bc = Edge.init(triangle.b, triangle.c);
	var ca = Edge.init(triangle.c, triangle.a);
	return [ab,bc,ca]
		.map( edge => Edge.getIntersection(edge, line) )
		.filter( p => !!p )
		.sort(Point.measure);
}

export function getOppositeSide(triangle,point){
	if ( Point.equals(triangle.a, point) ){
		return Edge.init(triangle.b, triangle.c);
	} else if ( Point.equals(triangle.b, point) ){
		return Edge.init(triangle.c, triangle.a);
	} else if ( Point.equals(triangle.c, point) ){
		return Edge.init(triangle.a, triangle.b);
	} else {
		return null;
	}
}

export function containsPoint(triangle, point, error) {
	var x1 = triangle.a.x - point.x;
	var y1 = triangle.a.y - point.y;
	var x2 = triangle.b.x - point.x;
	var y2 = triangle.b.y - point.y;
	var x3 = triangle.c.x - point.x;
	var y3 = triangle.c.y - point.y;
	var v1 = x1 * y2 - y1 * x2;
	var v2 = x2 * y3 - y2 * x3;
	var v3 = x3 * y1 - y3 * x1;
	if ( error && error > 0 ){
		return (v1 > -error && v2 > -error && v3 > -error ) 
			|| (v1 < error && v2 < error && v3 < error);
	} else {
		return (v1 >= 0 && v2 >= 0 && v3 >= 0) || (v1 <= 0 && v2 <= 0 && v3 <= 0);

	}
}

export function isVertex(triangle,point){
	return Point.equals(triangle.a,point) || Point.equals(triangle.b,point) || Point.equals(triangle.c,point);
}

export function isEdge(triangle,edge){
	return isVertex(triangle,edge.a) && isVertex(triangle,edge.b);
}

export function hasSameVertex(self,other){
	return isVertex(self, other.a) || isVertex(self, other.b) || isVertex(self, other.c);
}

export function getCircumscribed(triangle){
	const a = triangle.a;
	const b = triangle.b;
	const c = triangle.c;
	var cc = 2 * ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
	if ( cc === 0 ) {
		console.error("error value too small");
		return null;
	}
	//http://tercel-sakuragaoka.blogspot.jp/2011/06/processingdelaunay_3958.html
	var p = b.x * b.x - a.x * a.x + b.y * b.y - a.y * a.y;
	var q = c.x * c.x - a.x * a.x + c.y * c.y - a.y * a.y;
	var center = {
		x: ((c.y - a.y) * p + (a.y - b.y) * q) / cc,
		y: ((a.x - c.x) * p + (b.x - a.x) * q) / cc
	};
	var r = Point.measure(center, a);
	return Circle.init(center, r);
}
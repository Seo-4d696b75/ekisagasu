import * as line from "./Line";
import * as point from "./Point";
import * as edge from "./Edge";
import * as circle from "./Circle";
import {Point, Line, Edge, Triangle, Circle, DiagramError} from "./types"

class TriangleInitError extends DiagramError {}

export function init(a: Edge | Point,b: Point,c?: Point): Triangle{
	if ( edge.isEdge(a) ){
		var e = a;
		c = b;
		b = e.b;
		a = e.a;
	}
	if ( c ){

		if ( line.onLine(a,b,c) ) {
			throw new TriangleInitError(`points are on the same line. a:${point.toString(a)} b:${point.toString(b)} c:${point.toString(c)}`)
		}
		var array = [a,b,c].sort(point.compare);
		return {
			a: array[0],
			b: array[1],
			c: array[2],
		};
	}
	throw new TriangleInitError("invalid arguments")
}

/**
 * 同値判定
 * @param {triangle} self 
 * @param {triangle} other 
 */
export function equals(self: Triangle,other: Triangle): boolean{
	return point.equals(self.a,other.a) && point.equals(self.b,other.b) && point.equals(self.c, other.c);
}

export function hashCode(t: Triangle): number{
	var hash = 17;
	hash = 31 * hash + point.hashCode(t.a);
	hash = 31 * hash + point.hashCode(t.b);
	hash = 31 * hash + point.hashCode(t.c);
	return hash & hash;
}

/**
 * 三角形との交点をすべて取得する
 * @param {triangle} triangle 
 * @param {line/edge} line 
 * @return {array} Pointの自然順序付けに従いソートされた交点のリスト 0 <= array.length <= 3
 */
export function getIntersection(triangle: Triangle,ln: Line): Array<Point>{
	var ab = edge.init(triangle.a, triangle.b);
	var bc = edge.init(triangle.b, triangle.c);
	var ca = edge.init(triangle.c, triangle.a);
	return [ab,bc,ca]
		.map( e => edge.getIntersection(e, ln) )
		.filter( (p: Point | null): p is Point => p !== null )
		.sort(point.measure);
}

export function getOppositeSide(triangle: Triangle, p: Point): Edge{
	if ( point.equals(triangle.a, p) ){
		return edge.init(triangle.b, triangle.c);
	} else if ( point.equals(triangle.b, p) ){
		return edge.init(triangle.c, triangle.a);
	} else if ( point.equals(triangle.c, p) ){
		return edge.init(triangle.a, triangle.b);
	} else {
		throw new DiagramError("point is not any vertex of a triangle")
	}
}

export function containsPoint(triangle: Triangle, p: Point, error: number = 0.0): boolean {
	var x1 = triangle.a.x - p.x;
	var y1 = triangle.a.y - p.y;
	var x2 = triangle.b.x - p.x;
	var y2 = triangle.b.y - p.y;
	var x3 = triangle.c.x - p.x;
	var y3 = triangle.c.y - p.y;
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

export function isVertex(triangle: Triangle ,p: Point): boolean{
	return point.equals(triangle.a,p) || point.equals(triangle.b,p) || point.equals(triangle.c,p);
}

export function isEdge(triangle: Triangle, e: Edge): boolean{
	return isVertex(triangle,e.a) && isVertex(triangle,e.b);
}

export function hasSameVertex(self: Triangle, other: Triangle): boolean{
	return isVertex(self, other.a) || isVertex(self, other.b) || isVertex(self, other.c);
}

export function getCircumscribed(triangle: Triangle): Circle{
	const a = triangle.a;
	const b = triangle.b;
	const c = triangle.c;
	var cc = 2 * ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
	if ( cc === 0 ) {
		throw new circle.CircleError("triangle too small")
	}
	//http://tercel-sakuragaoka.blogspot.jp/2011/06/processingdelaunay_3958.html
	var p = b.x * b.x - a.x * a.x + b.y * b.y - a.y * a.y;
	var q = c.x * c.x - a.x * a.x + c.y * c.y - a.y * a.y;
	var center = {
		x: ((c.y - a.y) * p + (a.y - b.y) * q) / cc,
		y: ((a.x - c.x) * p + (b.x - a.x) * q) / cc
	};
	var r = point.measure(center, a);
	return circle.init(center, r);
}
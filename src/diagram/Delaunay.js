import {ObjectSet, ObjectMap} from "./utils"
import * as Point from "./Point";
import * as Edge from "./Edge";
import * as Triangle from "./Triangle";
import * as Line from "./Line";
import * as Circle from "./Circle";
import * as Rect from "./Rectangle"
import {Builder as PolygonBuilder} from "./Polygon";


class TrianglePair {

	constructor(edge,point1,point2){
		this.edge = edge;
		this.p1 = point1;
		this.p2 = point2 ? point2 : null;
		this.t1 = Triangle.init(edge, point1);
		this.t2 = point2 ? Triangle.init(edge, point2) : null;
	}

	replace(change){
		if ( !this.t2 ){
			this.t2 = Triangle.init(this.edge, change);
			return;
		}
		var apx = this.p1.x - this.edge.a.x;
		var apy = this.p1.y - this.edge.a.y;
		var bpx = this.p1.x - this.edge.b.x;
		var bpy = this.p1.y - this.edge.b.y;
		var aqx = change.x - this.edge.a.x;
		var aqy = change.y - this.edge.a.y;
		var bqx = change.x - this.edge.b.x;
		var bqy = change.y - this.edge.b.y;
		if ((apx * bpy - apy * bpx) * (aqx * bqy - aqy * bqx) > 0) {
			this.t1 = Triangle.init(this.edge, change);
			this.p1 = change;
		} else {
			this.t2 = Triangle.init(this.edge, change);
			this.p2 = change;
		}
	}

	isFlip(){
		return !!this.p2 && 
		Circle.containsPoint(
			Triangle.getCircumscribed(this.t1), 
			this.p2
		);
	}

	flip(){
		var old = this.edge;
		this.edge = Edge.init(this.p1, this.p2);
		this.p1 = old.a;
		this.p2 = old.b;
		this.t1 = Triangle.init(this.edge, this.p1);
		this.t2 = Triangle.init(this.edge, this.p2);
	}

}

export class Delaunay {

	constructor(points){
		this.points = new ObjectSet(Point.equals, Point.hashCode, points);
		

	}

	split(boundary){
		const time = performance.now();
		const container = Rect.getContainer(boundary);
		this.triangles = new ObjectSet(Triangle.equals, Triangle.hashCode);
		this.edges = [];
		this.trianglePairs = new ObjectMap(Edge.equals, Edge.hashCode);
		this.triangles.add(container);
		var ab = Edge.init(container.a, container.b);
		var bc = Edge.init(container.b, container.c);
		var ca = Edge.init(container.c, container.a);
		this.trianglePairs.put(ab, new TrianglePair(ab, container.c));
		this.trianglePairs.put(bc, new TrianglePair(bc, container.a));
		this.trianglePairs.put(ca, new TrianglePair(ca, container.b));
		console.log("calculate delaunay diagram");
		const progress = {
			percent: 0
		};
		console.log("progress", progress);
		var size = this.points.size();
		var cnt = 0;
		for ( let point of this.points ){
			var t = this.getContainer(point);
			if ( !t ){
				throw new Error("point outside border rect.");
			}
			this.addPoint(point, t);
			cnt++;
			progress.percent = (cnt * 100 / size).toPrecision(2);
		}
		const builder = new PolygonBuilder();
		this.triangles = this.triangles.removeIf( element => this.isOutSide(element, container, builder));
		if ( !builder.closed ) throw new Error("fail to calcuate frame");
		var list = builder.build();
		this.normalizeDirection(list);
		const length = list.length;

		var previous = list[length - 1];
		for ( let i=0 ; i<length ; i++ ){
			var current = list[i];
			var next = list[(i+1)%length];
			var cross = (current.x - previous.x) * (next.y - current.y)
				- (current.y - previous.y) * (next.x - current.x);
			if ( cross > 0 ){
				previous = current;
			} else {
				this.addPointOutside(previous, current, next);
			}
		}

		this.solvedTriangle = this.triangles;
		this.solvedEdge = new ObjectSet(Edge.equals, Edge.hashCode);
		for ( let item of this.solvedTriangle ){
			this.solvedEdge.add(Edge.init(item.a, item.b));
			this.solvedEdge.add(Edge.init(item.b, item.c));
			this.solvedEdge.add(Edge.init(item.c, item.a));
		}

		this.solvedPair = new ObjectMap(Edge.equals, Edge.hashCode);
		for ( let edge of this.solvedEdge ){
			var pair = this.trianglePairs.get(edge);
			if ( !pair ) throw new Error("No pair found.");
			this.solvedPair.put(edge, pair);
		}

		this.triangles = null;
		this.edges = null;
		this.trianglePairs = null;

		console.log(`time: ${performance.now() - time}ms`);
	}

	isOutSide(next, container, builer){
		var a = Triangle.isVertex(next, container.a);
		var b = Triangle.isVertex(next, container.b);
		var c = Triangle.isVertex(next, container.c);
		var cnt = 0;
		if ( a ) cnt++;
		if ( b ) cnt++;
		if ( c ) cnt++;
		if ( cnt === 1 ){
			if (a) builer.append(Triangle.getOppositeSide(next, container.a));
			if (b) builer.append(Triangle.getOppositeSide(next, container.b));
			if (c) builer.append(Triangle.getOppositeSide(next, container.c));
			return true;
		} else if ( cnt === 2 ){
			return true;
		} else {
			return false;
		}
	}

	normalizeDirection(list){
		const length = list.length;
		var sum = 0;
		for ( let i=0 ; i<length ; i++ ){
			var previous = list[(i+length-1)%length];
			var current = list[i];
			var next = list[(i+1)%length];

			var ax = current.x - previous.x;
			var ay = current.y - previous.y;
			var bx = next.x - current.x;
			var by = next.y - current.y;
			var cross = ax * by - ay * bx;
			// -PI < argument < PI
			var inner = ax * bx + ay * by;
			var argument = Math.atan(cross / inner);
			if ( inner < 0 ){
				// |argument| > PI/2
				if ( argument < 0 ){
					argument += Math.PI;
				} else {
					argument -= Math.PI;
				}
			}
			sum += argument;
		}
		if ( sum < 0 ){
			list.reverse();
		}
	}

	getContainer(point){
		for ( let item of this.triangles ){
			if ( Triangle.containsPoint(item, point) ) return item;
		}
		return null;
	}

	addPointOutside(a,b,c){
		this.edges = [];

		var ab = Edge.init(a,b);
		var bc = Edge.init(b,c);
		var ac = Edge.init(c,a);

		this.trianglePairs.get(ab).replace(c);
		this.trianglePairs.get(bc).replace(a);
		this.trianglePairs.put(ac, new TrianglePair(ac, b));
		this.triangles.add(Triangle.init(a,b,c));

		this.edges.push(ab);
		this.edges.push(bc);

		this.resolveDelaunay();
	}

	resolveDelaunay(){
		while ( this.edges.length > 0 ){
			var edge = this.edges.shift();
			var pair = this.trianglePairs.get(edge);
			if ( pair.isFlip() ){
				this.trianglePairs.remove(edge);
				if ( !this.triangles.remove(pair.t1) ||
				!this.triangles.remove(pair.t2) ) throw new Error("fail to delete");
				pair.flip();
				this.trianglePairs.put(pair.edge, pair);
				if ( !this.triangles.add(pair.t1) ||
				!this.triangles.add(pair.t2) ) throw new Error("fail to add");
				var a1 = Edge.init(pair.p1, pair.edge.a);
				var b1 = Edge.init(pair.p1, pair.edge.b);
				var a2 = Edge.init(pair.p2, pair.edge.a);
				var b2 = Edge.init(pair.p2, pair.edge.b);
				this.edges.push(a1);
				this.edges.push(b1);
				this.edges.push(a2);
				this.edges.push(b2);
				this.trianglePairs.get(a1).replace(pair.edge.b);
				this.trianglePairs.get(b1).replace(pair.edge.a);
				this.trianglePairs.get(a2).replace(pair.edge.b);
				this.trianglePairs.get(b2).replace(pair.edge.a);
			}
		}
	}

	addPoint(p,t){
		this.edges = [];
		if ( Triangle.isVertex(t,p) ){
			return;
		} else if ( Edge.onEdge(t.a, t.b, p) ){
			this.addOnEdge(t.a, t.b, t.c, p);
		} else if ( Edge.onEdge(t.b, t.c, p) ){
			this.addOnEdge(t.b, t.c, t.a, p);
		} else if ( Edge.onEdge(t.c, t.a, p) ){
			this.addOnEdge(t.c, t.a, t.b, p);
		} else {
			this.addInTriangle(p, t);
		}
	}

	addInTriangle(p, t){
		if ( !this.triangles.remove(t) ) throw new Error("fail to remove");
		var ab = Edge.init(t.a, t.b);
		var bc = Edge.init(t.b, t.c);
		var ca = Edge.init(t.c, t.a);

		this.trianglePairs.get(ab).replace(p);
		this.trianglePairs.get(bc).replace(p);
		this.trianglePairs.get(ca).replace(p);

		var pa = Edge.init(t.a, p);
		var pb = Edge.init(t.b, p);
		var pc = Edge.init(t.c, p);
		var ta = new TrianglePair(pa, t.c, t.b);
		var tb = new TrianglePair(pb, t.a, t.c);
		var tc = new TrianglePair(pc, t.b, t.a);
		this.trianglePairs.put(pa, ta);
		this.trianglePairs.put(pb, tb);
		this.trianglePairs.put(pc, tc);
		if ( !this.triangles.add(ta.t1)
		|| !this.triangles.add(tb.t1)
		|| !this.triangles.add(tc.t1) ) throw new Error("fail to add");

		this.edges.push(ab);
		this.edges.push(bc);
		this.edges.push(ca);

		this.resolveDelaunay();

	}

	addOnEdge(a,b,c,p){
		var old = Edge.init(a, b);
		var pair = this.trianglePairs.remove(old);
		var d = Line.onSameSide(Edge.toLine(old), pair.p1) ? pair.p2 : pair.p1;

		this.triangles.remove(pair.t1);
		this.triangles.remove(pair.t2);
		var pc = Edge.init(p, c);
		var pd = Edge.init(p, d);
		var pa = Edge.init(p, a);
		var pb = Edge.init(p, b);
		var innerPair = new TrianglePair(pc, a, b);
		var outerPair = new TrianglePair(pd, a, b);
		this.triangles.add(innerPair.t1);
		this.triangles.add(innerPair.t2);
		this.triangles.add(outerPair.t1);
		this.triangles.add(outerPair.t2);
		this.trianglePairs.put(pc, innerPair);
		this.trianglePairs.put(pd, outerPair);
		this.trianglePairs.put(pa, new TrianglePair(pa, d, c));
		this.trianglePairs.put(pb, new TrianglePair(pb, d, c));

		var ac = Edge.init(a, c);
		var bc = Edge.init(b, c);
		var ad = Edge.init(a, d);
		var bd = Edge.init(b, d);
		this.trianglePairs.get(ac).replace(p);
		this.trianglePairs.get(bc).replace(p);
		this.trianglePairs.get(ad).replace(p);
		this.trianglePairs.get(bd).replace(p);
		this.edges.offer(ac);
		this.edges.offer(bc);
		this.edges.offer(ad);
		this.edges.offer(bd);

		this.resolveDelaunay();

	}

}
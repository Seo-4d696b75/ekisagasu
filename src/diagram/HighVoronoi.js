import * as Point from "./Point";
import * as Line from "./Line";
import * as Edge from "./Edge";
import * as Triangle from "./Triangle";
import {ObjectSet} from "./utils";


const STEP_UP = 1;
const STEP_ZERO = 0;
const STEP_DOWN = -1;

const ERROR = Math.pow(2, -30);

/**
 * Point + 付加情報 のラッパー
 */
class Node {

	constructor(point, a, b){
		this.x = point.x;
		this.y = point.y;
		this.p1 = a;
		this.p2 = b;
		var cnt = 0;
		if ( a.line.isBoundary ) cnt++;
		if ( b.line.isBoundary ) cnt++;
		if ( cnt === 0 ){
			this.onBoundary = false;
			this.index = -1;
		} else if ( cnt === 1 ){
			this.onBoundary = true;
			this.index = -1;
		} else {
			this.onBoundary = false;
			this.index = 0;
		}
	}

	/**
	 * 辿ってきた辺とは異なる線分上の隣接頂点でかつ辺のボロノイ次数が同じになる方を返す.
	 * @param {*} previous from which you are traversing
	 * @return Node
	 */
	next(previous){
		const p1 = this.p1;
		const p2 = this.p2;
		if ( p1.next && Point.equals(p1.next, previous) ){
			return this.calcNext(p1, p2, false, -p1.step);
		} else if ( p1.previous && Point.equals(p1.previous, previous) ){
			return this.calcNext(p1, p2, true, p1.step);
		} else if ( p2.next && Point.equals(p2.next, previous) ){
			return this.calcNext(p2, p1, false, -p2.step);
		} else if ( p2.previous && Point.equals(p2.previous, previous)){
			return this.calcNext(p2, p1, true, p2.step);
		} else {
			throw new Error("next node not found.");
		}
	}

	calcNext(current, other, forward, step){
		if ( this.onBoundary && this.index > 0 ){
			// 頂点がFrame境界線上（Vertexではない）でかつ
                // この頂点が解決済みなら無視して同じ境界線上のお隣さんへ辿る
			return forward ? current.next.node : current.previous.node;
		} else {
                // 頂点がFrame内部なら step = Node.STEP_UP/DOWN　のいずれか
                // FrameのVertexに位置する場合は例外的に step = Node.STEP_ZERO
			return other.neighbor(-step).node;
		}
	}

	/**
	 * 辿ってきた辺とは異なる線分上の隣接頂点のうちこの頂点から見てボロノイ次数が
         * 下がるまたは変化しない方を返す.<br>
         * この頂点がFrame内部なら必ず次数が下がる隣接頂点を返すが、
         * Frame境界線のVertexに相当する場合は例外的に次数変化0の方向の頂点を返す
	 * @param {*} previous 
	 */
	nextDown(previous){
		var target = null;
		if ( this.p1.isNeighbor(previous) ){
			target = this.p2;
		} else if ( this.p2.isNeighbor(previous) ){
			target = this.p1;
		} else {
			throw new Error("neighbor not found");
		}
		if( target.hasNeighbor(STEP_DOWN) ){
			return target.neighbor(STEP_DOWN).node;
		} else {
			return target.neighbor(STEP_ZERO).node;
		}
	}

	nextUp(previous){
		var t1 = null;
		var t2 = null;
		if ( this.p1.isNeighbor(previous) ){
			t1 = this.p2;
			t2 = this.p1;
		} else if ( this.p2.isNeighbor(previous) ){
			t1 = this.p1;
			t2 = this.p2;
		} else {
			throw new Error("neighbor not found");
		}
		if ( t1.hasNeighbor(STEP_UP) ){
			return t1.neighbor(STEP_UP).node;
		} else if ( t2.hasNeighbor(STEP_UP) ){
			return t2.neighbor(STEP_UP).node;
		} else {
			return null;
		}
	}

	onSolved(level){
		this.p1.onSolved();
		this.p2.onSolved();
		if ( this.index < 0 ){
			if ( this.p1.line.isBoundary || this.p2.line.isBoundary ){
				this.index = level;
			} else {
				this.index = level + 0.5;
			}
		} else if ( Math.round(this.index) !== this.index ){
			if ( this.index + 0.5 !== level ) throw new Error("index mismatch");
		}
	}

	hasSolved(){
		return this.index >= 0;
	}	

	release(){
		this.p1 = null;
		this.p2 = null;
	}

}

class Intersection {

	constructor(point, line, other, center){
		this.line = line;
		this.x = point.x;
		this.y = point.y;

		if ( other ){

			var dx = line.line.b;
			var dy = -line.line.a;
			if (dx < 0 || (dx === 0 && dy < 0)) {
				dx *= -1;
				dy *= -1;
			}
			var p = {
				x: point.x + dx,
				y: point.y + dy
			};
			this.step = Line.onSameSide(other, p, center) ? STEP_DOWN : STEP_UP;
		} else {
			this.step = STEP_ZERO;
		}
	}

	insert(previous, next, index){
		this.previous = previous;
		this.next = next;
		if ( this.previous ) {
			this.previous.next = this;
		}
		if ( this.next ){
			this.next.previous = this;
			this.next.incrementIndex();
		}
		this.index = index;
	}

	incrementIndex(){
		this.index++;
		if ( this.next ) this.next.incrementIndex();
	}

	isNeighbor(p){
		return ( this.next && Point.equals(this.next, p) )
			|| ( this.previous && Point.equals(this.previous, p));
	}

	hasNeighbor(step){
		if ( step === 0 && this.step === 0 ) {
			return true;
		} else if ( step !== 0 && this.step !== 0 ){
			return (step === this.step) ? !!this.next : !!this.previous;
		}
		return false;
	}

	neighbor(step){
		if ( step === 0 && this.step === 0 ){
			if ( this.previous ) return this.previous;
			if ( this.next ) return this.next;
		} else if ( step !== 0 && this.step !== 0 ){
			return ( step === this.step ) ? this.next : this.previous;
		}
		throw new Error("neighbor step invalid.");
	}

	onSolved(){
		this.line.onIntersectionSolved(this);
	}

	release(){
		this.previous =  null;
		this.next = null;
		if ( this.node ){
			this.node.release();
			this.node = null;
		}
	}
}

class Bisector {

	constructor(line, point){
		this.line = line;
		this.intersections = [];
		if ( point ){
			this.delaunayPoint = point;
			this.isBoundary = false;
		} else {
			this.delaunayPoint = null;
			this.isBoundary = true;
		}
	}

	/**
	 * 
	 * @param {* boundary :Edge
	 */
	inspectBoundary(boundary){
		var p = Line.getIntersection(this.line, boundary);
		if ( p ) {
			var i = new Intersection(p, this, Edge.toLine(boundary));
			this.addIntersection(i);
		}
	}

	onIntersectionSolved(intersection){
		var index = intersection.index;
		this.solvedPointIndexFrom = Math.min(
			this.solvedPointIndexFrom,
			index
		);
		this.solvedPointIndexTo = Math.max(
			this.solvedPointIndexTo,
			index
		);
	}

	addIntersection(intersection){
		const size = this.intersections.length;
		var index = this.addIntersectionAt(intersection, 0, size);
		intersection.insert(
			index > 0 ? this.intersections[index-1] : null,
			index < size ? this.intersections[index] : null,
			index
		);
		this.intersections.splice(index, 0, intersection);
		if ( this.solvedPointIndexFrom < this.solvedPointIndexTo ){
			if ( index <= this.solvedPointIndexFrom ){
				this.solvedPointIndexFrom++;
				this.solvedPointIndexTo++;
			} else if ( index <= this.solvedPointIndexTo ){
				throw new Error("new intersection added to solved range.");
			}
		}
	}

	addIntersectionAt(point, indexFrom, indexTo){
		if ( indexFrom === indexTo ){
			return indexFrom;
		} else {
			var mid = Math.floor((indexFrom + indexTo - 1) / 2);
			var r = Point.compare(point, this.intersections[mid]);
			if ( r < 0 ){
				return this.addIntersectionAt(point, indexFrom, mid);
			} else if ( r > 0 ){
				return this.addIntersectionAt(point, mid + 1, indexTo);
			} else {
				throw new Error("same point already added in this bisector");
			}
		}
	}

	release(){
		this.intersections.forEach( i => i.release());
		this.intersections = null;
	}

}

export class Voronoi {

	/**
	 * 
	 * @param {triangle} frame 
	 * @param {(point)=>Promise<array>} provider 
	 */
	constructor(frame,provider){
		this.container = frame;
		this.provider = provider;
	}



	/**
	 * 
	 * @param {number} level 
	 * @param {point} center 
	 * @param {(index: number,polygon: array)=>void} callback
	 * @return Promise
	 */
	execute(level, center, callback){
		if ( this.running ) return Promise.reject("already running");
		this.running = true;

		return Promise.resolve().then(() => {

			this.center = center;

			this.level = level;
			this.targetLevel = 1;
			this.list = null;
			this.time = performance.now();
			this.result = [];
			this.callback = callback;


			this.bisectors = [];

			this.addBoundary(Line.init(this.container.a, this.container.b));
			this.addBoundary(Line.init(this.container.b, this.container.c));
			this.addBoundary(Line.init(this.container.c, this.container.a));

			this.requestedPoint = new ObjectSet(Point.equals, Point.hashCode);
			this.addedPoint = new ObjectSet(Point.equals, Point.hashCode);

			this.requestedPoint.add(center);
			this.addedPoint.add(center);
			

			return this.provider(center);
		}).then( neighbors =>{
			for (let point of neighbors) {
				if (this.addedPoint.add(point)) this.addBisector(point);
			}
			return this.searchPolygon();
		});

	}

	searchPolygon(){
		return Promise.resolve().then(() => {
			this.loopTime = performance.now();
			this.promise = [];

			var list = this.traverse(this.list);
			list.forEach(node => node.onSolved(this.targetLevel));

			this.result.push(list);
			this.list = list;

			return Promise.all(this.promise);
		}).then( () => {

			console.log(`execute index:${this.targetLevel} time:${performance.now() - this.loopTime}`)

			if (this.callback) {
				this.callback(this.targetLevel - 1, this.list);
			}
			return this.targetLevel + 1;
		}).then( nextLevel => {

			if ( nextLevel < this.level ){
				this.targetLevel = nextLevel;
				return this.searchPolygon();
			} else {
				this.bisectors.forEach(b => b.release());
				console.log(`execute done. time:${performance.now() - this.time}`);

				this.running = false;

				return this.result;
			}
		});
		
	}

	traverse(list){
		var next = null;
		var previous = null;
		if ( !list ){
			var history = new ObjectSet(Point.equals, Point.hashCode);
			var sample = this.bisectors[0];
			next = sample.intersections[1].node;
			previous = sample.intersections[0];
			while ( history.add(next) ){
				var current = next;
				next = current.nextDown(previous);
				previous = current;
			}
		} else {
			previous = list[list.length-1];
			for ( let n of list ){
				next = n.nextUp(previous);
				previous = n;
				if ( next && !next.hasSolved() ) break;
			}
		}

		if ( !next || !previous || next.hasSolved() ){
			throw new Error("fail to traverse polygon");
		}

		var start = next;
		list = [start];
		while ( true ){
			this.requestExtension(next.p1.line.delaunayPoint);
			this.requestExtension(next.p2.line.delaunayPoint);
			current = next;
			next = current.next(previous);
			previous = current;
			if ( Point.equals(start, next) ) break;
			list.push(next);
		}

		return list;
	}

	requestExtension(point){
		if ( point && this.requestedPoint.add(point) ){
			var task = this.provider(point).then( neighbors => {
				for (let p of neighbors) {
					if (this.addedPoint.add(p)) {
						this.addBisector(p);
					}
				}
			});
			this.promise.push(task);
		}
	}

	/**
	 * 
	 * @param {*} self Line 
	 */
	addBoundary(self){
		var boundary = new Bisector(self);
		this.bisectors.forEach( preexist => {
			var p = Line.getIntersection(boundary.line, preexist.line);
			var a = new Intersection(p, boundary);
			var b = new Intersection(p, preexist);
			var n = new Node(p, a, b);
			a.node = n;
			b.node = n;
			boundary.addIntersection(a);
			preexist.addIntersection(b);
		});
		this.bisectors.push(boundary);
	}

	addBisector(point){
		var line = Line.getPerpendicularBisector(point, this.center);
		var bisector = new Bisector(line, point);
		this.bisectors.forEach( preexist => {
			var p = Line.getIntersection(bisector.line, preexist.line);
			if ( p && Triangle.containsPoint(this.container, p, ERROR) ){
				var a = new Intersection(p, bisector, preexist.line, this.center);
				var b = new Intersection(p, preexist, bisector.line, this.center);
				var n = new Node(p, a, b);
				a.node = n;
				b.node = n;
				bisector.addIntersection(a);
				preexist.addIntersection(b);
			}
		});
		this.bisectors.push(bisector);
	}



}
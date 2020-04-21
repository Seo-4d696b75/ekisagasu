import * as Point from "./Point";
import {ObjectSet} from "./utils";
import * as Edge from "./Edge";

class EdgeGroup {

	constructor(edge){
		this.list = [edge.a, edge.b];
		this.p1 = edge.a;
		this.p2 = edge.b;

	}

	closed(){
		return Point.equals(this.p1, this.p2);
	}

	merge(group){
		if ( Point.equals(this.p1, group.p1) ){
			var reverse = group.list.slice(1, group.list.length).reverse();
			this.list = reverse.concat(this.list);
			this.p1 = group.p2;
		} else if ( Point.equals(this.p1, group.p2) ){
			this.list = group.list.slice(0, group.list.length-1).concat(this.list);
			this.p1 = group.p1;
		} else if ( Point.equals(this.p2, group.p1) ){
			this.list = this.list.slice(0, this.list.length-1).concat(group.list);
			this.p2 = group.p2;
		} else if ( Point.equals(this.p2, group.p2) ){
			var tmp = group.list.slice(0, group.list.length-1).reverse();
			this.list = this.list.concat(tmp);
			this.p2 = group.p1;
		} else {
			return false;
		}
		return true;
	}

}

export class Builder {


	constructor(){
		this.closed = false;
		this.groups = [];
		this.edges = new ObjectSet(Edge.equals, Edge.hashCode);
	}

	append(edge){
		if ( this.closed ){
			throw new Error("Polygon already closed.");
		}
		if ( !this.edges.add(edge) ) return;
		
		var group = new EdgeGroup(edge);
		this.groups = this.groups.filter( g => !group.merge(g));
		this.groups.push(group);
		this.closed = this.groups.length === 1 && group.closed();
	}

	isLine(){
		return this.groups.length === 1;
	}

	getLine(){
		if ( this.isLine() ){
			return this.groups[0].list;
		} else {
			return null;
		}
	}

	build(){
		if ( this.closed ){
			var list = this.groups[0].list;
			return list.slice(0, list.length-1);
		}
		return null;
	}
}
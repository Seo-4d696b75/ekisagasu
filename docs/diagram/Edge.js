
const Edge = {
	init: function (a, b) {
		if (a.x < b.x) {
			return { a: a, b: b };
		} else if (a.x > b.x) {
			return { a: b, b: a };
		} else {
			if (a.y < b.y) {
				return { a: a, b: b };
			} else if (a.y > b.y) {
				return { a: b, b: a };
			} else {
				console.error("Edge::init > point duplicated", a);
				return null;
			}
		}
	},

	toLine: function (edge) {
		return Line.init(edge.a, edge.b);
	},

	equals: function (self, other) {
		return Point.equals(self.a, other.a) && Point.equals(self.b, other.b);
	},

	hashCode: function (edge) {
		var hash = 17;
		hash = 31 * hash + Point.hashCode(edge.a);
		hash = 31 * hash + Point.hashCode(edge.b);
		return hash & hash;
	},

	getMiddlePoint: function (edge) {
		return {
			x: (edge.a.x + edge.b.x) / 2,
			y: (edge.a.y + edge.b.y) / 2,
		};
	},

	onEdge: function (start, end, p) {
		if (start.a && start.b) {
			return onEdge(start.a, start.b, end);
		}
		if ((start.x - p.x) * (end.x - p.x) + (start.y - p.y) * (end.y - p.y) <= 0) {
			return Line.onLine(start, end, p);
		} else {
			return false;
		}
	},

	getDivision: function (edge, index) {
		return Point.getDivision(edge.a, edge.b, index);
	},

	/**
	 * 交点を取得する
	 * @param {edge} edge 
	 * @param {edge/line} other 
	 * @return null if no such point
	 */
	getIntersection: function (edge, other) {
		if (other.a && other.b) {
			if (other.c) {
				var p = Line.getIntersection(toLine(edge), other);
				var v = (edge.a.x - p.x) * (edge.b.x - p.x) + (edge.a.y - p.y) * (edge.b.y - p.y);
				return v <= 0 ? p : null;
			} else {
				p = getIntersection(edge, toLine(other));
				if (p) {
					v = (other.a.x - p.x) * (other.b.x - p.x) + (other.a.y - p.y) * (other.b.y - p.y);
					if (v <= 0) return p;
				}
				return null;
			}
		}
		return null;
	},

	getDistance: function (edge, p) {
		var v1 = (p.x - edge.a.x) * (edge.b.x - edge.a.x) + (p.y - edge.a.y) * (edge.b.y - edge.a.y);
		var v2 = (p.x - edge.b.x) * (edge.a.x - edge.b.x) + (p.y - edge.b.y) * (edge.a.y - edge.b.y);
		if (v1 > 0 && v2 > 0) {
			return Line.getDistance(toLine(edge), p);
		} else if (v1 <= 0) {
			return Point.measure(edge.a, p);
		} else {
			return Point.measure(edge.b, p);
		}
	}
}
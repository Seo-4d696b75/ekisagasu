
const Circle = {

	init : function(center, radius) {
		return {
			center: center,
			radius: radius,
		};
	},

	containsPoint : function(circle, point) {
		return Point.measure(point, circle.center) < circle.radius;
	}

}
